import { derived, type Readable } from 'svelte/store';
import { appState } from './state';
import { rollup, type Rollup } from '../calc/rollup';
import type { Simulation } from '../types';

/**
 * Plan-tab derived stores. These exist so the /plan page can subscribe to
 * pre-bucketed views of the state without re-running the bucketing on every
 * unrelated re-render.
 *
 * Bucketing rules:
 *   - An explicit `Assignment` puts its sim into the matching HPC bucket.
 *   - A locked sim with `pinnedHpcId` and NO explicit assignment is rendered
 *     implicitly in its pinned HPC's bucket (matches the synthetic-assignment
 *     behaviour in `calc/rollup` so the UI placement stays consistent with
 *     what the rollup is actually counting).
 *   - Everything else is "unassigned" — i.e. a sim with no explicit assignment
 *     AND no implicit lock-pin destination.
 */

/** sims grouped by the HPC they're assigned to (explicit or implicit-locked). */
export const assignedByHpc: Readable<Record<string, Simulation[]>> = derived(
  appState,
  ($s) => {
    const simsById = new Map($s.simulations.map((sim) => [sim.id, sim]));
    const out: Record<string, Simulation[]> = {};
    for (const hpc of $s.hpcs) out[hpc.id] = [];

    const explicitSimIds = new Set<string>();
    for (const a of $s.assignments) {
      explicitSimIds.add(a.simulationId);
      const sim = simsById.get(a.simulationId);
      if (!sim) continue;
      if (!out[a.hpcId]) out[a.hpcId] = [];
      out[a.hpcId].push(sim);
    }

    // Implicit locked-with-pinned assignments.
    for (const sim of $s.simulations) {
      if (!sim.locked || !sim.pinnedHpcId) continue;
      if (explicitSimIds.has(sim.id)) continue;
      if (!out[sim.pinnedHpcId]) out[sim.pinnedHpcId] = [];
      out[sim.pinnedHpcId].push(sim);
    }

    return out;
  }
);

/**
 * Sims with no explicit assignment AND not locked-with-pinned (locked sims
 * are always shown at their pinned HPC, never in the tray).
 */
export const unassigned: Readable<Simulation[]> = derived(appState, ($s) => {
  const explicitSimIds = new Set($s.assignments.map((a) => a.simulationId));
  return $s.simulations.filter((sim) => {
    if (explicitSimIds.has(sim.id)) return false;
    if (sim.locked && sim.pinnedHpcId) return false;
    return true;
  });
});

/** Live rollup — feeds the per-HPC budget meters. */
export const rollupStore: Readable<Rollup> = derived(appState, ($s) => rollup($s));
