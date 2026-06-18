import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { defaultState } from '../schema';
import type {
  AppState,
  Assignment,
  Hpc,
  Model,
  Simulation
} from '../types';

/**
 * The single source of truth for the whole application.
 *
 * Initialised synchronously with `defaultState()` so that SSR / prerender and
 * non-browser test code can read a valid value without touching localStorage.
 * In the browser, `+layout.svelte` hydrates it from persistence on mount.
 */
export const appState: Writable<AppState> = writable<AppState>(defaultState());

// ---------- derived slices ----------
//
// These exist mainly so components can subscribe to the slice they need
// without re-rendering on unrelated changes. They are intentionally trivial
// pass-throughs — any non-trivial derivation belongs in `src/lib/calc/`.

export const hpcsStore: Readable<Hpc[]> = derived(appState, ($s) => $s.hpcs);

export const modelsStore: Readable<Model[]> = derived(appState, ($s) => $s.models);

export const simulationsStore: Readable<Simulation[]> = derived(
  appState,
  ($s) => $s.simulations
);

export const assignmentsStore: Readable<Assignment[]> = derived(
  appState,
  ($s) => $s.assignments
);

export const dataPortfoliosStore: Readable<string[]> = derived(
  appState,
  ($s) => $s.dataPortfolios
);

export const resolutionsStore: Readable<string[]> = derived(
  appState,
  ($s) => $s.resolutions
);
