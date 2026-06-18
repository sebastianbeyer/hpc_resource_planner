import type {
  AppState,
  Assignment,
  Hpc,
  Model,
  ModelCost,
  Period,
  Simulation
} from './types';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * An empty-but-valid state with seeded shared vocabularies.
 */
export function defaultState(): AppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    hpcs: [],
    models: [],
    simulations: [],
    assignments: [],
    dataPortfolios: ['minimal', 'standard', 'extended'],
    resolutions: ['tco79', 'tco399', 'tco1279', 'tco2559']
  };
}

// ---------- helpers ----------

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function fail(path: string, msg: string): never {
  throw new Error(`Invalid state at "${path}": ${msg}`);
}

function ensureString(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, `expected string, got ${typeOf(value)}`);
  return value;
}

function ensureNonEmptyString(value: unknown, path: string): string {
  const s = ensureString(value, path);
  if (s.length === 0) fail(path, 'expected non-empty string');
  return s;
}

function ensureFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, `expected finite number, got ${typeOf(value)}`);
  }
  return value;
}

function ensureNonNegativeNumber(value: unknown, path: string): number {
  const n = ensureFiniteNumber(value, path);
  if (n < 0) fail(path, `expected non-negative number, got ${n}`);
  return n;
}

function ensurePositiveInteger(value: unknown, path: string): number {
  const n = ensureFiniteNumber(value, path);
  if (!Number.isInteger(n) || n <= 0) {
    fail(path, `expected positive integer, got ${n}`);
  }
  return n;
}

function ensureArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, `expected array, got ${typeOf(value)}`);
  return value;
}

function ensureObject(value: unknown, path: string): Record<string, unknown> {
  if (!isObject(value)) fail(path, `expected object, got ${typeOf(value)}`);
  return value;
}

function ensureBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, `expected boolean, got ${typeOf(value)}`);
  return value;
}

function typeOf(x: unknown): string {
  if (x === null) return 'null';
  if (Array.isArray(x)) return 'array';
  return typeof x;
}

// ---------- per-shape validators ----------

function validatePeriod(value: unknown, path: string): Period {
  const o = ensureObject(value, path);
  const id = ensureNonEmptyString(o.id, `${path}.id`);
  const label = ensureString(o.label, `${path}.label`);
  const cpuHoursBudget = ensureNonNegativeNumber(o.cpuHoursBudget, `${path}.cpuHoursBudget`);
  const gpuHoursBudget = ensureNonNegativeNumber(o.gpuHoursBudget, `${path}.gpuHoursBudget`);
  return { id, label, cpuHoursBudget, gpuHoursBudget };
}

function validateHpc(value: unknown, path: string): Hpc {
  const o = ensureObject(value, path);
  const id = ensureNonEmptyString(o.id, `${path}.id`);
  const name = ensureString(o.name, `${path}.name`);
  const storageBudgetTb = ensureNonNegativeNumber(o.storageBudgetTb, `${path}.storageBudgetTb`);
  const periodsRaw = ensureArray(o.periods, `${path}.periods`);
  const periods = periodsRaw.map((p, i) => validatePeriod(p, `${path}.periods[${i}]`));
  return { id, name, storageBudgetTb, periods };
}

function validateModelCost(value: unknown, path: string): ModelCost {
  const o = ensureObject(value, path);
  const cpuHoursPerSimMonth = ensureNonNegativeNumber(
    o.cpuHoursPerSimMonth,
    `${path}.cpuHoursPerSimMonth`
  );
  const gpuHoursPerSimMonth = ensureNonNegativeNumber(
    o.gpuHoursPerSimMonth,
    `${path}.gpuHoursPerSimMonth`
  );
  const storageRaw = ensureObject(
    o.storageTbPerSimMonthByPortfolio,
    `${path}.storageTbPerSimMonthByPortfolio`
  );
  const storageTbPerSimMonthByPortfolio: Record<string, number> = {};
  for (const [k, v] of Object.entries(storageRaw)) {
    storageTbPerSimMonthByPortfolio[k] = ensureNonNegativeNumber(
      v,
      `${path}.storageTbPerSimMonthByPortfolio.${k}`
    );
  }
  return {
    cpuHoursPerSimMonth,
    gpuHoursPerSimMonth,
    storageTbPerSimMonthByPortfolio
  };
}

function validateModel(value: unknown, path: string): Model {
  const o = ensureObject(value, path);
  const id = ensureNonEmptyString(o.id, `${path}.id`);
  const name = ensureString(o.name, `${path}.name`);
  const costsRaw = ensureObject(o.costs, `${path}.costs`);
  const costs: Record<string, Record<string, ModelCost>> = {};
  for (const [resolution, byHpc] of Object.entries(costsRaw)) {
    const byHpcObj = ensureObject(byHpc, `${path}.costs.${resolution}`);
    const inner: Record<string, ModelCost> = {};
    for (const [hpcId, cost] of Object.entries(byHpcObj)) {
      inner[hpcId] = validateModelCost(cost, `${path}.costs.${resolution}.${hpcId}`);
    }
    costs[resolution] = inner;
  }
  return { id, name, costs };
}

function validateSimulation(value: unknown, path: string): Simulation {
  const o = ensureObject(value, path);
  const id = ensureNonEmptyString(o.id, `${path}.id`);
  const name = ensureString(o.name, `${path}.name`);
  const modelId = ensureString(o.modelId, `${path}.modelId`);
  const resolution = ensureString(o.resolution, `${path}.resolution`);
  const lengthYears = ensureNonNegativeNumber(o.lengthYears, `${path}.lengthYears`);
  const ensembles = ensureNonNegativeNumber(o.ensembles, `${path}.ensembles`);
  const dataPortfolio = ensureString(o.dataPortfolio, `${path}.dataPortfolio`);
  const overheadMultiplier = ensureFiniteNumber(
    o.overheadMultiplier,
    `${path}.overheadMultiplier`
  );
  if (overheadMultiplier < 0) {
    fail(`${path}.overheadMultiplier`, `expected non-negative number, got ${overheadMultiplier}`);
  }
  const locked = ensureBoolean(o.locked, `${path}.locked`);

  const sim: Simulation = {
    id,
    name,
    modelId,
    resolution,
    lengthYears,
    ensembles,
    dataPortfolio,
    overheadMultiplier,
    locked
  };

  if (o.packageLabel !== undefined) {
    sim.packageLabel = ensureString(o.packageLabel, `${path}.packageLabel`);
  }
  if (o.pinnedHpcId !== undefined) {
    sim.pinnedHpcId = ensureString(o.pinnedHpcId, `${path}.pinnedHpcId`);
  }
  if (o.zeroCompute !== undefined) {
    sim.zeroCompute = ensureBoolean(o.zeroCompute, `${path}.zeroCompute`);
  }
  if (locked && sim.pinnedHpcId === undefined) {
    fail(`${path}.pinnedHpcId`, 'required when simulation is locked');
  }

  return sim;
}

function validateAssignment(value: unknown, path: string): Assignment {
  const o = ensureObject(value, path);
  const simulationId = ensureNonEmptyString(o.simulationId, `${path}.simulationId`);
  const hpcId = ensureNonEmptyString(o.hpcId, `${path}.hpcId`);
  const splitRaw = ensureObject(o.periodSplit, `${path}.periodSplit`);
  const periodSplit: Record<string, number> = {};
  for (const [periodId, fraction] of Object.entries(splitRaw)) {
    const f = ensureFiniteNumber(fraction, `${path}.periodSplit.${periodId}`);
    if (f < 0 || f > 1) {
      fail(`${path}.periodSplit.${periodId}`, `expected number in [0,1], got ${f}`);
    }
    periodSplit[periodId] = f;
  }
  return { simulationId, hpcId, periodSplit };
}

function validateStringArray(value: unknown, path: string): string[] {
  const arr = ensureArray(value, path);
  return arr.map((s, i) => ensureString(s, `${path}[${i}]`));
}

// ---------- top-level ----------

/**
 * Hand-rolled runtime validator. Throws Error with a clear message on any
 * shape mismatch. Returns the value typed as AppState on success.
 */
export function validateState(input: unknown): AppState {
  if (input === null || input === undefined) {
    throw new Error('Invalid state: expected an object, got ' + typeOf(input));
  }
  if (!isObject(input)) {
    throw new Error('Invalid state: expected an object, got ' + typeOf(input));
  }

  const requiredKeys = [
    'schemaVersion',
    'hpcs',
    'models',
    'simulations',
    'assignments',
    'dataPortfolios',
    'resolutions'
  ] as const;
  for (const k of requiredKeys) {
    if (!(k in input)) {
      throw new Error(`Invalid state: missing required key "${k}"`);
    }
  }

  const schemaVersion = ensurePositiveInteger(input.schemaVersion, 'schemaVersion');

  const hpcsRaw = ensureArray(input.hpcs, 'hpcs');
  const hpcs = hpcsRaw.map((h, i) => validateHpc(h, `hpcs[${i}]`));

  const modelsRaw = ensureArray(input.models, 'models');
  const models = modelsRaw.map((m, i) => validateModel(m, `models[${i}]`));

  const simsRaw = ensureArray(input.simulations, 'simulations');
  const simulations = simsRaw.map((s, i) => validateSimulation(s, `simulations[${i}]`));

  const assignmentsRaw = ensureArray(input.assignments, 'assignments');
  const assignments = assignmentsRaw.map((a, i) => validateAssignment(a, `assignments[${i}]`));

  const dataPortfolios = validateStringArray(input.dataPortfolios, 'dataPortfolios');
  const resolutions = validateStringArray(input.resolutions, 'resolutions');

  return {
    schemaVersion,
    hpcs,
    models,
    simulations,
    assignments,
    dataPortfolios,
    resolutions
  };
}

/**
 * Migrate an unknown state blob to the current schema version, then validate.
 * For v1 this is just a validation pass; future versions can be slotted into
 * the switch below.
 */
export function migrate(state: unknown): AppState {
  // If schemaVersion is missing entirely, assume v1.
  let working: unknown = state;
  if (isObject(working) && !('schemaVersion' in working)) {
    working = { ...working, schemaVersion: 1 };
  }

  if (!isObject(working)) {
    // Let validateState produce the canonical error.
    return validateState(working);
  }

  const rawVersion = working.schemaVersion;
  const version =
    typeof rawVersion === 'number' && Number.isInteger(rawVersion) && rawVersion > 0
      ? rawVersion
      : 1;

  let current: Record<string, unknown> = { ...working, schemaVersion: version };

  // Forward-migration ladder: each step bumps schemaVersion by 1.
  // Add cases here as new versions land.
  while ((current.schemaVersion as number) < CURRENT_SCHEMA_VERSION) {
    const v = current.schemaVersion as number;
    switch (v) {
      // case 1: current = migrateV1toV2(current); break;
      default:
        throw new Error(
          `Cannot migrate from schemaVersion ${v}: no migration registered`
        );
    }
  }

  if ((current.schemaVersion as number) > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Cannot migrate from schemaVersion ${current.schemaVersion}: ` +
        `newer than supported (${CURRENT_SCHEMA_VERSION})`
    );
  }

  return validateState(current);
}
