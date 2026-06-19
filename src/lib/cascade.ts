import type { AppState } from './types';

/**
 * Compute the set of side-effects of deleting an HPC, returned as counters
 * the UI can use to build a meaningful confirm prompt.
 */
export type HpcDeleteImpact = {
  assignmentCount: number;
  lockedSimCount: number;
  computeCostColumnCount: number;
};

export function describeHpcDelete(state: AppState, hpcId: string): HpcDeleteImpact {
  const assignmentCount = state.assignments.filter((a) => a.hpcId === hpcId).length;
  const lockedSimCount = state.simulations.filter(
    (s) => s.locked && s.pinnedHpcId === hpcId
  ).length;
  let computeCostColumnCount = 0;
  for (const m of state.models) {
    for (const byHpc of Object.values(m.costs)) {
      if (hpcId in byHpc) computeCostColumnCount += 1;
    }
  }
  return { assignmentCount, lockedSimCount, computeCostColumnCount };
}

/**
 * Pure function that removes the HPC from state and cascades the deletion:
 *  - drops assignments whose hpcId matches
 *  - clears pinnedHpcId on simulations pinned to it (also clearing `locked`,
 *    because a locked sim must have a pin)
 *  - strips the matching column from every model's compute cost matrix
 */
export function cascadeDeleteHpc(state: AppState, hpcId: string): AppState {
  const hpcs = state.hpcs.filter((h) => h.id !== hpcId);
  const assignments = state.assignments.filter((a) => a.hpcId !== hpcId);
  const simulations = state.simulations.map((s) => {
    if (s.pinnedHpcId !== hpcId) return s;
    const { pinnedHpcId: _pinned, ...rest } = s;
    void _pinned;
    return { ...rest, locked: false };
  });
  const models = state.models.map((m) => {
    const costs: typeof m.costs = {};
    for (const [res, byHpc] of Object.entries(m.costs)) {
      const inner: typeof byHpc = {};
      for (const [hid, cell] of Object.entries(byHpc)) {
        if (hid !== hpcId) inner[hid] = cell;
      }
      costs[res] = inner;
    }
    return { ...m, costs };
  });
  return { ...state, hpcs, assignments, simulations, models };
}

export type ModelDeleteImpact = {
  simulationCount: number;
  simulationNames: string[];
};

export function describeModelDelete(state: AppState, modelId: string): ModelDeleteImpact {
  const refs = state.simulations.filter((s) => s.modelId === modelId);
  return {
    simulationCount: refs.length,
    simulationNames: refs.map((s) => s.name || '(unnamed)')
  };
}

/**
 * Pure function that removes a model and clears modelId on any simulations
 * that referenced it (leaving the sims in place — the user can repoint or
 * delete them manually). Assignments are intentionally preserved.
 */
export function cascadeDeleteModel(state: AppState, modelId: string): AppState {
  const models = state.models.filter((m) => m.id !== modelId);
  const simulations = state.simulations.map((s) =>
    s.modelId === modelId ? { ...s, modelId: '' } : s
  );
  return { ...state, models, simulations };
}
