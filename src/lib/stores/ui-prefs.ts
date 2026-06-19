import { writable } from 'svelte/store';

// UI-only preferences (e.g. which collapsible sections are open). Persisted
// separately from AppState so the exported JSON / shared URL stays free of
// view state.
const STORAGE_KEY = 'hpc-resource-planner:ui:v1';

export type UiPrefs = {
  trayDoneOpen: boolean;
  periodDoneOpen: Record<string, boolean>;
  expandedSimIds: string[];
};

const defaults: UiPrefs = {
  trayDoneOpen: false,
  periodDoneOpen: {},
  expandedSimIds: []
};

export const uiPrefs = writable<UiPrefs>(defaults);

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function loadUiPrefs(): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (raw === null) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!isObject(parsed)) return;
  const periodMap = isObject(parsed.periodDoneOpen) ? parsed.periodDoneOpen : {};
  const sanitisedPeriod: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(periodMap)) {
    if (typeof v === 'boolean') sanitisedPeriod[k] = v;
  }
  const expandedSimIds = Array.isArray(parsed.expandedSimIds)
    ? parsed.expandedSimIds.filter((x): x is string => typeof x === 'string')
    : defaults.expandedSimIds;
  uiPrefs.set({
    trayDoneOpen: typeof parsed.trayDoneOpen === 'boolean' ? parsed.trayDoneOpen : defaults.trayDoneOpen,
    periodDoneOpen: sanitisedPeriod,
    expandedSimIds
  });
}

export function attachUiPrefsAutosave(): () => void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return () => {};
  }
  let primed = false;
  const unsub = uiPrefs.subscribe((v) => {
    if (!primed) {
      primed = true;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {
      // Quota / disabled storage — silently drop.
    }
  });
  return unsub;
}

export function setTrayDoneOpen(open: boolean): void {
  uiPrefs.update((p) => ({ ...p, trayDoneOpen: open }));
}

export function setPeriodDoneOpen(periodId: string, open: boolean): void {
  uiPrefs.update((p) => ({
    ...p,
    periodDoneOpen: { ...p.periodDoneOpen, [periodId]: open }
  }));
}

export function setSimExpanded(simId: string, expanded: boolean): void {
  uiPrefs.update((p) => {
    const set = new Set(p.expandedSimIds);
    if (expanded) set.add(simId);
    else set.delete(simId);
    return { ...p, expandedSimIds: [...set] };
  });
}

export function forgetSimUi(simId: string): void {
  uiPrefs.update((p) => {
    if (!p.expandedSimIds.includes(simId)) return p;
    return { ...p, expandedSimIds: p.expandedSimIds.filter((id) => id !== simId) };
  });
}
