import { describe, expect, it } from 'vitest';
import { exportState, importState } from './json';
import { defaultState } from '$lib/schema';
import type { AppState } from '$lib/types';

function makeFullState(): AppState {
  return {
    schemaVersion: 3,
    hpcs: [
      {
        id: 'hpc-1',
        name: 'Levante',
        storageBudgetTb: 500,
        periods: [
          { id: 'p-1', label: '2026', cpuHoursBudget: 1000, gpuHoursBudget: 100 },
          { id: 'p-2', label: '2027', cpuHoursBudget: 2000, gpuHoursBudget: 200 }
        ]
      }
    ],
    models: [
      {
        id: 'model-1',
        name: 'IFS',
        costs: {
          tco399: {
            'hpc-1': {
              cpuHoursPerSimMonth: 100,
              gpuHoursPerSimMonth: 0
            }
          }
        },
        storageTbPerSimMonthByResolution: {
          tco399: { standard: 0.5 }
        }
      }
    ],
    simulations: [
      {
        id: 'sim-1',
        name: 'historical',
        modelId: 'model-1',
        resolution: 'tco399',
        lengthYears: 10,
        ensembles: 1,
        dataPortfolio: 'standard',
        overheadMultiplier: 1.15,
        locked: false,
        completed: false
      }
    ],
    assignments: [
      {
        simulationId: 'sim-1',
        hpcId: 'hpc-1',
        periodSplit: { 'p-1': 0.5, 'p-2': 0.5 }
      }
    ],
    dataPortfolios: ['minimal', 'standard', 'extended'],
    resolutions: ['tco79', 'tco399', 'tco1279', 'tco2559']
  };
}

describe('exportState', () => {
  it('produces pretty-printed JSON with 2-space indent', () => {
    const s = defaultState();
    const json = exportState(s);
    // Has newlines and a 2-space indent on at least one nested key.
    expect(json).toContain('\n');
    expect(json).toMatch(/\n {2}"schemaVersion"/);
  });

  it('includes schemaVersion in the output', () => {
    const s = defaultState();
    const json = exportState(s);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(s.schemaVersion);
  });
});

describe('importState round-trip', () => {
  it('round-trips defaultState() exactly', () => {
    const s = defaultState();
    const restored = importState(exportState(s));
    expect(restored).toEqual(s);
  });

  it('round-trips a non-trivial state with HPC, model, sim, and assignment', () => {
    const s = makeFullState();
    const restored = importState(exportState(s));
    expect(restored).toEqual(s);
  });
});

describe('importState error handling', () => {
  it('throws a helpful error on malformed JSON', () => {
    expect(() => importState('{ not json')).toThrow(/Could not parse JSON:/);
  });

  it('throws a helpful error on empty input', () => {
    expect(() => importState('')).toThrow(/Could not parse JSON:/);
  });

  it('rejects a state missing the hpcs array', () => {
    const s = defaultState() as Partial<AppState>;
    delete (s as Record<string, unknown>).hpcs;
    expect(() => importState(JSON.stringify(s))).toThrow(/Invalid state:/);
  });

  it('rejects a state with the wrong type for a required key', () => {
    const s = { ...defaultState(), hpcs: 'not-an-array' };
    expect(() => importState(JSON.stringify(s))).toThrow(/Invalid state/);
  });

  it('rejects a non-object root (e.g. an array)', () => {
    expect(() => importState('[]')).toThrow(/Invalid state:/);
  });
});

describe('importState migration', () => {
  it('accepts payload with schemaVersion: 3 (current)', () => {
    const s = { ...defaultState(), schemaVersion: 3 };
    const out = importState(JSON.stringify(s));
    expect(out.schemaVersion).toBe(3);
  });

  it('migrates payload with schemaVersion: 1', () => {
    const s = {
      schemaVersion: 1,
      hpcs: [],
      models: [],
      simulations: [],
      assignments: [],
      dataPortfolios: [],
      resolutions: []
    };
    const out = importState(JSON.stringify(s));
    expect(out.schemaVersion).toBe(3);
  });

  it('treats missing schemaVersion as v1 and succeeds via migrate', () => {
    const s = defaultState() as Partial<AppState>;
    delete (s as Record<string, unknown>).schemaVersion;
    const out = importState(JSON.stringify(s));
    expect(out.schemaVersion).toBe(3);
  });
});
