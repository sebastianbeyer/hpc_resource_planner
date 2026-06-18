import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get, writable } from 'svelte/store';
import {
  AUTOSAVE_DEBOUNCE_MS,
  STORAGE_KEY,
  attachAutosave,
  loadFromLocalStorage
} from './persistence';
import { defaultState } from '../schema';
import type { AppState } from '../types';

/**
 * Wrap `Storage.prototype.setItem` so we can count writes. `vi.spyOn` on the
 * Proxy-wrapped `window.localStorage` instance is silently bypassed by
 * jsdom, so we patch the prototype directly.
 */
function trackSetItem() {
  const proto = Object.getPrototypeOf(window.localStorage) as Storage;
  const original = proto.setItem;
  let n = 0;
  proto.setItem = function patched(this: Storage, ...args: [string, string]) {
    n++;
    return original.apply(this, args);
  };
  return {
    count: () => n,
    restore: () => {
      proto.setItem = original;
    }
  };
}

function makeState(): AppState {
  const s = defaultState();
  s.hpcs.push({
    id: 'hpc-1',
    name: 'LUMI',
    storageBudgetTb: 100,
    periods: [{ id: 'p-1', label: '2026', cpuHoursBudget: 1000, gpuHoursBudget: 500 }]
  });
  return s;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('loadFromLocalStorage', () => {
  it('returns null when localStorage is empty', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('round-trips a previously serialised state', () => {
    const state = makeState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const loaded = loadFromLocalStorage();
    expect(loaded).toEqual(state);
  });

  it('returns null on corrupt JSON without throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{this is not valid json');
    expect(() => loadFromLocalStorage()).not.toThrow();
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null when JSON is valid but fails schema validation', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, hpcs: 'not-an-array' })
    );
    expect(() => loadFromLocalStorage()).not.toThrow();
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns null on a JSON primitive (not an object)', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(42));
    expect(loadFromLocalStorage()).toBeNull();
  });
});

describe('attachAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the serialised state to localStorage after the debounce period', () => {
    const store = writable<AppState>(defaultState());
    const unsub = attachAutosave(store);

    const next = makeState();
    store.set(next);

    // Nothing written yet (still inside the debounce window).
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 50);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(next);

    unsub();
  });

  it('coalesces multiple rapid changes into a single write', () => {
    const store = writable<AppState>(defaultState());
    const writes = trackSetItem();
    const unsub = attachAutosave(store);

    const a = makeState();
    a.hpcs[0].name = 'A';
    const b = makeState();
    b.hpcs[0].name = 'B';
    const c = makeState();
    c.hpcs[0].name = 'C';

    store.set(a);
    vi.advanceTimersByTime(50);
    store.set(b);
    vi.advanceTimersByTime(50);
    store.set(c);

    // Still inside the debounce window — no write yet.
    expect(writes.count()).toBe(0);

    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 50);

    expect(writes.count()).toBe(1);
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(JSON.parse(raw as string)).toEqual(c);

    unsub();
    writes.restore();
  });

  it('does not write on the initial subscription emission', () => {
    const store = writable<AppState>(defaultState());
    const writes = trackSetItem();
    const unsub = attachAutosave(store);

    // Svelte's writable calls the subscriber synchronously with the current
    // value when subscribed — that emission must NOT trigger a write.
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 50);
    expect(writes.count()).toBe(0);

    unsub();
    writes.restore();
  });

  it('returned unsubscribe stops further writes', () => {
    const store = writable<AppState>(defaultState());
    const writes = trackSetItem();
    const unsub = attachAutosave(store);

    // Apply a change but unsubscribe before the debounce fires — pending
    // write should be cancelled.
    store.set(makeState());
    unsub();

    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 50);
    expect(writes.count()).toBe(0);

    // Subsequent updates after unsubscribe must also be ignored.
    const after = makeState();
    after.hpcs[0].name = 'after-unsub';
    store.set(after);
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 50);
    expect(writes.count()).toBe(0);

    writes.restore();
  });

  it('round-trips through localStorage: write via autosave, read via loader', () => {
    const store = writable<AppState>(defaultState());
    const unsub = attachAutosave(store);

    const next = makeState();
    store.set(next);
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS + 50);

    const loaded = loadFromLocalStorage();
    expect(loaded).toEqual(next);
    expect(get(store)).toEqual(next);

    unsub();
  });
});
