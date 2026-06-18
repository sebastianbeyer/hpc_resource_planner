import type { AppState, Assignment } from '../types';
import { simulationCost } from './cost';
import { allocateAcrossPeriods } from './allocate';

/**
 * Per-HPC roll-up of used vs. budget, broken down by period for compute and
 * accumulated wholesale for storage. This is what the Plan tab feeds straight
 * into its budget meters.
 */
export type HpcRollup = {
  storageUsedTb: number;
  storageBudgetTb: number;
  storageOverBudget: boolean;
  periods: Record<
    string,
    {
      cpuUsed: number;
      cpuBudget: number;
      cpuOverBudget: boolean;
      gpuUsed: number;
      gpuBudget: number;
      gpuOverBudget: boolean;
    }
  >;
};

export type Rollup = Record<string, HpcRollup>;

/**
 * Walk every assignment in the state and accumulate per-HPC, per-period
 * compute usage plus per-HPC storage usage.
 *
 * Special cases (per plan):
 *   - Storage is wholesale per HPC; it is NOT period-scoped.
 *   - A locked sim with a `pinnedHpcId` but no explicit `Assignment` is
 *     treated as implicitly assigned: 100% on the HPC's first period (or
 *     `{}` if the HPC has no periods, in which case all compute is dropped
 *     but storage still lands on the pinned HPC).
 *   - Periods named in `periodSplit` that don't exist on the target HPC are
 *     silently ignored at the calc layer. The data is stale (e.g. user
 *     renamed a period); surfacing that is the UI's job.
 *   - Sims with a missing model, or assignments pointing at missing HPCs /
 *     sims, are skipped.
 */
export function rollup(state: AppState): Rollup {
  const out: Rollup = {};
  const simsById = new Map(state.simulations.map((s) => [s.id, s]));
  const modelsById = new Map(state.models.map((m) => [m.id, m]));
  const hpcsById = new Map(state.hpcs.map((h) => [h.id, h]));
  const explicitlyAssignedSimIds = new Set(
    state.assignments.map((a) => a.simulationId)
  );

  // Initialise the per-HPC structure with zero-used and the real budgets.
  for (const hpc of state.hpcs) {
    const periods: HpcRollup['periods'] = {};
    for (const p of hpc.periods) {
      periods[p.id] = {
        cpuUsed: 0,
        cpuBudget: p.cpuHoursBudget,
        cpuOverBudget: false,
        gpuUsed: 0,
        gpuBudget: p.gpuHoursBudget,
        gpuOverBudget: false
      };
    }
    out[hpc.id] = {
      storageUsedTb: 0,
      storageBudgetTb: hpc.storageBudgetTb,
      storageOverBudget: false,
      periods
    };
  }

  // Collect the assignments we need to apply: explicit ones + synthesised
  // ones for locked-and-pinned sims that lack an explicit assignment.
  const effectiveAssignments: Assignment[] = [...state.assignments];
  for (const sim of state.simulations) {
    if (
      sim.locked &&
      sim.pinnedHpcId &&
      !explicitlyAssignedSimIds.has(sim.id)
    ) {
      const hpc = hpcsById.get(sim.pinnedHpcId);
      // Synthesise even if the HPC is missing — we'll skip below.
      const firstPeriodId = hpc?.periods[0]?.id;
      const periodSplit: Record<string, number> =
        firstPeriodId !== undefined ? { [firstPeriodId]: 1 } : {};
      effectiveAssignments.push({
        simulationId: sim.id,
        hpcId: sim.pinnedHpcId,
        periodSplit
      });
    }
  }

  for (const assignment of effectiveAssignments) {
    const sim = simsById.get(assignment.simulationId);
    if (!sim) continue;
    const hpcBucket = out[assignment.hpcId];
    if (!hpcBucket) continue;
    const model = modelsById.get(sim.modelId);
    if (!model) continue;

    const cost = simulationCost(sim, model, assignment.hpcId);

    // Storage is per-HPC, not period-scoped.
    hpcBucket.storageUsedTb += cost.storageTb;

    const perPeriod = allocateAcrossPeriods(
      { cpuHours: cost.cpuHours, gpuHours: cost.gpuHours },
      assignment.periodSplit
    );
    for (const [periodId, compute] of Object.entries(perPeriod)) {
      const periodBucket = hpcBucket.periods[periodId];
      if (!periodBucket) continue; // stale period reference — silently ignore
      periodBucket.cpuUsed += compute.cpuHours;
      periodBucket.gpuUsed += compute.gpuHours;
    }
  }

  // Finalise over-budget flags.
  for (const hpcBucket of Object.values(out)) {
    hpcBucket.storageOverBudget = hpcBucket.storageUsedTb > hpcBucket.storageBudgetTb;
    for (const p of Object.values(hpcBucket.periods)) {
      p.cpuOverBudget = p.cpuUsed > p.cpuBudget;
      p.gpuOverBudget = p.gpuUsed > p.gpuBudget;
    }
  }

  return out;
}

/**
 * Convenience: returns true if any HPC in the rollup has any of its
 * over-budget flags set. Handy for a global warning indicator in the chrome.
 */
export function isOverBudget(r: Rollup): boolean {
  for (const hpc of Object.values(r)) {
    if (hpc.storageOverBudget) return true;
    for (const p of Object.values(hpc.periods)) {
      if (p.cpuOverBudget || p.gpuOverBudget) return true;
    }
  }
  return false;
}
