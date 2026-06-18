import type { Writable } from 'svelte/store';
import { migrate } from '../schema';
import type { AppState } from '../types';

/** localStorage key for the serialised AppState blob. */
export const STORAGE_KEY = 'hpc-resource-planner:state:v1';

/** Debounce window (ms) between a store change and the localStorage write. */
export const AUTOSAVE_DEBOUNCE_MS = 250;

/**
 * Try to load a previously-persisted AppState from localStorage.
 *
 * Returns `null` on any failure (missing key, non-browser environment,
 * malformed JSON, schema validation failure). The caller should simply leave
 * the existing in-memory state untouched in that case — the store is already
 * initialised with `defaultState()`.
 */
export function loadFromLocalStorage(): AppState | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  try {
    return migrate(parsed);
  } catch {
    return null;
  }
}

/**
 * Subscribe to `store` and persist its value to localStorage, debounced by
 * {@link AUTOSAVE_DEBOUNCE_MS}. Returns an unsubscribe function that also
 * cancels any pending write.
 *
 * No-op (returns a noop unsubscribe) outside a browser environment, so this
 * is safe to call from code that may run during SSR / prerender.
 */
export function attachAutosave(store: Writable<AppState>): () => void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return () => {};
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: AppState | null = null;
  // Skip the immediate first emission that Svelte's `subscribe` always fires
  // synchronously: it carries the initial value and would cause a redundant
  // write right after we just loaded from storage.
  let primed = false;

  const flush = () => {
    timer = null;
    if (pending === null) return;
    const snapshot = pending;
    pending = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota exceeded / storage disabled — silently drop. A future task adds
      // a toast for this.
    }
  };

  const unsubscribe = store.subscribe((value) => {
    if (!primed) {
      primed = true;
      return;
    }
    pending = value;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
  });

  return () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending = null;
    unsubscribe();
  };
}
