import { derived, type Readable } from 'svelte/store';
import { appState } from './state';
import { rollup, type Rollup } from '../calc/rollup';
import type { Simulation } from '../types';

/**
 * Plan-tab derived stores. These exist so the /plan page can subscribe to
 * pre-bucketed views of the state without re-running the bucketing on every
 * unrelated re-render.
 *
 * Bucketing rule:
 *   - An explicit `Assignment` puts its sim into the matching HPC bucket.
 *     Everything else is "unassigned".
 */

/** sims grouped by the HPC they're assigned to. */
export const assignedByHpc: Readable<Record<string, Simulation[]>> = derived(
  appState,
  ($s) => {
    const simsById = new Map($s.simulations.map((sim) => [sim.id, sim]));
    const out: Record<string, Simulation[]> = {};
    for (const hpc of $s.hpcs) out[hpc.id] = [];

    for (const a of $s.assignments) {
      const sim = simsById.get(a.simulationId);
      if (!sim) continue;
      if (!out[a.hpcId]) out[a.hpcId] = [];
      out[a.hpcId].push(sim);
    }

    return out;
  }
);

/** Sims with no explicit assignment. */
export const unassigned: Readable<Simulation[]> = derived(appState, ($s) => {
  const explicitSimIds = new Set($s.assignments.map((a) => a.simulationId));
  return $s.simulations.filter((sim) => !explicitSimIds.has(sim.id));
});

/** Live rollup — feeds the per-HPC budget meters. */
export const rollupStore: Readable<Rollup> = derived(appState, ($s) => rollup($s));
