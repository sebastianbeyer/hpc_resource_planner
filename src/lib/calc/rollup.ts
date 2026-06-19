import type { AppState, Assignment } from '../types';
import { simulationCost } from './cost';
import { allocateAcrossPeriods } from './allocate';

/**
 * One simulation's contribution to a single meter (CPU/GPU for a period, or
 * cumulative storage for the HPC). The Plan tab uses these to draw the bar
 * as a stack of per-sim segments with hover tooltips.
 */
export type MeterSegment = {
  simulationId: string;
  simulationName: string;
  modelId: string;
  modelName: string;
  value: number;
  completed: boolean;
};

/**
 * Per-HPC roll-up of used vs. budget, broken down by period for compute and
 * accumulated wholesale for storage. This is what the Plan tab feeds straight
 * into its budget meters.
 */
export type HpcRollup = {
  storageUsedTb: number;
  storageCompletedTb: number;
  storageBudgetTb: number;
  storageOverBudget: boolean;
  storageSegments: MeterSegment[];
  periods: Record<
    string,
    {
      cpuUsed: number;
      cpuCompleted: number;
      cpuBudget: number;
      cpuOverBudget: boolean;
      cpuSegments: MeterSegment[];
      gpuUsed: number;
      gpuCompleted: number;
      gpuBudget: number;
      gpuOverBudget: boolean;
      gpuSegments: MeterSegment[];
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
        cpuCompleted: 0,
        cpuBudget: p.cpuHoursBudget,
        cpuOverBudget: false,
        cpuSegments: [],
        gpuUsed: 0,
        gpuCompleted: 0,
        gpuBudget: p.gpuHoursBudget,
        gpuOverBudget: false,
        gpuSegments: []
      };
    }
    out[hpc.id] = {
      storageUsedTb: 0,
      storageCompletedTb: 0,
      storageBudgetTb: hpc.storageBudgetTb,
      storageOverBudget: false,
      storageSegments: [],
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
    if (sim.completed) hpcBucket.storageCompletedTb += cost.storageTb;
    if (cost.storageTb > 0) {
      hpcBucket.storageSegments.push({
        simulationId: sim.id,
        simulationName: sim.name,
        modelId: model.id,
        modelName: model.name,
        value: cost.storageTb,
        completed: sim.completed
      });
    }

    const perPeriod = allocateAcrossPeriods(
      { cpuHours: cost.cpuHours, gpuHours: cost.gpuHours },
      assignment.periodSplit
    );
    for (const [periodId, compute] of Object.entries(perPeriod)) {
      const periodBucket = hpcBucket.periods[periodId];
      if (!periodBucket) continue; // stale period reference — silently ignore
      periodBucket.cpuUsed += compute.cpuHours;
      periodBucket.gpuUsed += compute.gpuHours;
      if (sim.completed) {
        periodBucket.cpuCompleted += compute.cpuHours;
        periodBucket.gpuCompleted += compute.gpuHours;
      }
      if (compute.cpuHours > 0) {
        periodBucket.cpuSegments.push({
          simulationId: sim.id,
          simulationName: sim.name,
          modelId: model.id,
          modelName: model.name,
          value: compute.cpuHours,
          completed: sim.completed
        });
      }
      if (compute.gpuHours > 0) {
        periodBucket.gpuSegments.push({
          simulationId: sim.id,
          simulationName: sim.name,
          modelId: model.id,
          modelName: model.name,
          value: compute.gpuHours,
          completed: sim.completed
        });
      }
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
