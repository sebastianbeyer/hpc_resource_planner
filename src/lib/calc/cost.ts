import type { Model, Simulation } from '../types';

/**
 * Result of a cost calculation for a simulation (or package of sims) on a
 * specific HPC. `missingCost` is set when at least one input sim has no
 * matching compute cost cell defined for the (resolution, hpcId) pair — in
 * that case the missing sim contributes 0 compute, but storage can still be
 * computed from the HPC-independent model storage rates.
 */
export type SimCost = {
  cpuHours: number;
  gpuHours: number;
  storageTb: number;
  missingCost?: boolean;
};

/**
 * Compute the cost of running a single simulation on a specific HPC.
 *
 * Math (see plan "Calculation rules"):
 *   totalMonths     = lengthYears * 12 * ensembles
 *   cpuHours        = cost.cpuHoursPerSimMonth * totalMonths * overheadMultiplier
 *   gpuHours        = cost.gpuHoursPerSimMonth * totalMonths * overheadMultiplier
 *   storagePerMonth = model.storageTbPerSimMonthByResolution[resolution][portfolio] ?? 0
 *   storageTb       = storagePerMonth * totalMonths      // NO overhead on storage
 *
 * If `sim.zeroCompute` is true the compute totals are zeroed but storage is
 * still counted (historical/already-done data).
 *
 * If the model has no compute cost cell for the (resolution, hpcId) pair, the
 * result is flagged with `missingCost: true` and compute is zeroed.
 */
export function simulationCost(
  sim: Simulation,
  model: Model,
  hpcId: string
): SimCost {
  const cost = model.costs[sim.resolution]?.[hpcId];
  const totalMonths = sim.lengthYears * 12 * sim.ensembles;
  const storagePerMonth =
    model.storageTbPerSimMonthByResolution[sim.resolution]?.[sim.dataPortfolio] ?? 0;
  const storageTb = storagePerMonth * totalMonths;

  if (!cost) {
    return { cpuHours: 0, gpuHours: 0, storageTb, missingCost: true };
  }

  let cpuHours = cost.cpuHoursPerSimMonth * totalMonths * sim.overheadMultiplier;
  let gpuHours = cost.gpuHoursPerSimMonth * totalMonths * sim.overheadMultiplier;

  if (sim.zeroCompute === true) {
    cpuHours = 0;
    gpuHours = 0;
  }

  return { cpuHours, gpuHours, storageTb };
}

/**
 * Sum the cost of a set of simulations on a specific HPC. The sims' models
 * are resolved out of `models` by id; a sim whose model is missing contributes
 * zero compute and zero storage, and the result's `missingCost` flag is set.
 *
 * Useful for displaying per-package roll-up totals.
 */
export function packageCost(
  sims: Simulation[],
  models: Model[],
  hpcId: string
): SimCost {
  const modelsById = new Map(models.map((m) => [m.id, m]));

  let cpuHours = 0;
  let gpuHours = 0;
  let storageTb = 0;
  let missingCost = false;

  for (const sim of sims) {
    const model = modelsById.get(sim.modelId);
    if (!model) {
      missingCost = true;
      continue;
    }
    const c = simulationCost(sim, model, hpcId);
    if (c.missingCost) missingCost = true;
    cpuHours += c.cpuHours;
    gpuHours += c.gpuHours;
    storageTb += c.storageTb;
  }

  const result: SimCost = { cpuHours, gpuHours, storageTb };
  if (missingCost) result.missingCost = true;
  return result;
}
