export type Hpc = {
  id: string;
  name: string;
  storageBudgetTb: number;        // single accumulating bucket per HPC
  periods: Period[];
};

export type Period = {
  id: string;
  label: string;                  // e.g. "2026"
  cpuHoursBudget: number;
  gpuHoursBudget: number;
};

export type ModelCost = {
  cpuHoursPerSimMonth: number;
  gpuHoursPerSimMonth: number;
};

export type Model = {
  id: string;
  name: string;
  // costs[resolution][hpcId] = compute cost for that HPC
  costs: Record<string, Record<string, ModelCost>>;
  // storageTbPerSimMonthByResolution[resolution][portfolio] = TB / sim-month
  storageTbPerSimMonthByResolution: Record<string, Record<string, number>>;
};

export type Simulation = {
  id: string;
  name: string;
  modelId: string;
  resolution: string;
  lengthYears: number;
  ensembles: number;
  dataPortfolio: string;          // key into Model.storageTbPerSimMonthByResolution
  packageLabel?: string;          // visual grouping only
  overheadMultiplier: number;     // e.g. 1.15 = +15% for reruns
  locked: boolean;
  completed: boolean;             // already completed; rendered as consumed in meters
  pinnedHpcId?: string;           // required when locked
  zeroCompute?: boolean;          // for historical/already-done data
};

export type Assignment = {
  simulationId: string;
  hpcId: string;
  // map periodId → fraction in [0,1]; values must sum to 1
  periodSplit: Record<string, number>;
};

export type AppState = {
  schemaVersion: number;          // start at 1
  hpcs: Hpc[];
  models: Model[];
  simulations: Simulation[];
  assignments: Assignment[];
  dataPortfolios: string[];       // shared vocabulary
  resolutions: string[];          // shared vocabulary
};
