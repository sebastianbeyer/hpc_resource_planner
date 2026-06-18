import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, defaultState, migrate, validateState } from './schema';
import type { AppState } from './types';

function makeFullState(): AppState {
  return {
    schemaVersion: 1,
    hpcs: [
      {
        id: 'hpc-1',
        name: 'LUMI',
        storageBudgetTb: 500,
        periods: [
          { id: 'p-1', label: '2026', cpuHoursBudget: 1000, gpuHoursBudget: 500 },
          { id: 'p-2', label: '2027', cpuHoursBudget: 0, gpuHoursBudget: 0 }
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
              gpuHoursPerSimMonth: 0,
              storageTbPerSimMonthByPortfolio: { standard: 0.5, minimal: 0.1 }
            }
          }
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
        locked: false
      },
      {
        id: 'sim-2',
        name: 'pinned',
        modelId: 'model-1',
        resolution: 'tco399',
        lengthYears: 5,
        ensembles: 2,
        dataPortfolio: 'minimal',
        overheadMultiplier: 1.0,
        locked: true,
        pinnedHpcId: 'hpc-1',
        packageLabel: 'phase-1',
        zeroCompute: false
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

describe('defaultState', () => {
  it('returns a valid empty state with seeded vocabularies', () => {
    const s = defaultState();
    expect(s.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(s.hpcs).toEqual([]);
    expect(s.models).toEqual([]);
    expect(s.simulations).toEqual([]);
    expect(s.assignments).toEqual([]);
    expect(s.dataPortfolios).toEqual(['minimal', 'standard', 'extended']);
    expect(s.resolutions).toEqual(['tco79', 'tco399', 'tco1279', 'tco2559']);
  });

  it('passes validateState', () => {
    expect(() => validateState(defaultState())).not.toThrow();
  });

  it('returns a fresh object each call (no shared mutation)', () => {
    const a = defaultState();
    const b = defaultState();
    a.hpcs.push({ id: 'x', name: 'x', storageBudgetTb: 0, periods: [] });
    expect(b.hpcs).toEqual([]);
  });
});

describe('validateState', () => {
  it('validates a fully populated state', () => {
    const s = makeFullState();
    const out = validateState(s);
    expect(out).toEqual(s);
  });

  it('throws on null', () => {
    expect(() => validateState(null)).toThrow(/expected an object/);
  });

  it('throws on undefined', () => {
    expect(() => validateState(undefined)).toThrow(/expected an object/);
  });

  it('throws on non-object primitives', () => {
    expect(() => validateState(42)).toThrow(/expected an object/);
    expect(() => validateState('hi')).toThrow(/expected an object/);
    expect(() => validateState(true)).toThrow(/expected an object/);
  });

  it('throws on array (not an object root)', () => {
    expect(() => validateState([])).toThrow(/expected an object/);
  });

  it('throws when schemaVersion is missing', () => {
    const s: Partial<AppState> = { ...defaultState() };
    delete s.schemaVersion;
    expect(() => validateState(s)).toThrow(/missing required key "schemaVersion"/);
  });

  it('throws when schemaVersion is zero or negative', () => {
    expect(() => validateState({ ...defaultState(), schemaVersion: 0 })).toThrow(
      /positive integer/
    );
    expect(() => validateState({ ...defaultState(), schemaVersion: -1 })).toThrow(
      /positive integer/
    );
  });

  it('throws when schemaVersion is not an integer', () => {
    expect(() => validateState({ ...defaultState(), schemaVersion: 1.5 })).toThrow(
      /positive integer/
    );
  });

  it('throws when hpcs is missing', () => {
    const s: Record<string, unknown> = { ...defaultState() };
    delete s.hpcs;
    expect(() => validateState(s)).toThrow(/missing required key "hpcs"/);
  });

  it('throws when models is missing', () => {
    const s: Record<string, unknown> = { ...defaultState() };
    delete s.models;
    expect(() => validateState(s)).toThrow(/missing required key "models"/);
  });

  it('throws when an array key is not an array', () => {
    expect(() => validateState({ ...defaultState(), hpcs: {} })).toThrow(/expected array/);
  });

  it('throws on hpc with non-string id', () => {
    const s = defaultState();
    (s.hpcs as unknown[]).push({
      id: 42,
      name: 'x',
      storageBudgetTb: 0,
      periods: []
    });
    expect(() => validateState(s)).toThrow(/hpcs\[0\]\.id.*expected string/);
  });

  it('throws on hpc with empty-string id', () => {
    const s = defaultState();
    s.hpcs.push({ id: '', name: 'x', storageBudgetTb: 0, periods: [] });
    expect(() => validateState(s)).toThrow(/hpcs\[0\]\.id.*non-empty/);
  });

  it('allows a period with budget = 0 but rejects a negative budget', () => {
    const okState = defaultState();
    okState.hpcs.push({
      id: 'h',
      name: 'h',
      storageBudgetTb: 0,
      periods: [{ id: 'p', label: '2026', cpuHoursBudget: 0, gpuHoursBudget: 0 }]
    });
    expect(() => validateState(okState)).not.toThrow();

    const badState = defaultState();
    badState.hpcs.push({
      id: 'h',
      name: 'h',
      storageBudgetTb: 0,
      periods: [{ id: 'p', label: '2026', cpuHoursBudget: -1, gpuHoursBudget: 0 }]
    });
    expect(() => validateState(badState)).toThrow(/cpuHoursBudget.*non-negative/);
  });

  it('rejects negative storageBudgetTb on an Hpc', () => {
    const s = defaultState();
    s.hpcs.push({ id: 'h', name: 'h', storageBudgetTb: -5, periods: [] });
    expect(() => validateState(s)).toThrow(/storageBudgetTb.*non-negative/);
  });

  it('rejects a simulation with negative lengthYears', () => {
    const s = makeFullState();
    s.simulations[0].lengthYears = -1;
    expect(() => validateState(s)).toThrow(/lengthYears.*non-negative/);
  });

  it('rejects a simulation with non-finite overheadMultiplier', () => {
    const s = makeFullState();
    (s.simulations[0] as unknown as Record<string, unknown>).overheadMultiplier = Number.NaN;
    expect(() => validateState(s)).toThrow(/overheadMultiplier.*finite/);
  });

  it('rejects a locked simulation without pinnedHpcId', () => {
    const s = makeFullState();
    s.simulations[1].locked = true;
    delete s.simulations[1].pinnedHpcId;
    expect(() => validateState(s)).toThrow(/pinnedHpcId.*required when simulation is locked/);
  });

  it('rejects an assignment with fraction > 1', () => {
    const s = makeFullState();
    s.assignments[0].periodSplit['p-1'] = 1.5;
    expect(() => validateState(s)).toThrow(/periodSplit\.p-1.*\[0,1\]/);
  });

  it('rejects an assignment with negative fraction', () => {
    const s = makeFullState();
    s.assignments[0].periodSplit['p-1'] = -0.1;
    expect(() => validateState(s)).toThrow(/periodSplit\.p-1.*\[0,1\]/);
  });

  it('rejects a ModelCost with negative cpu hours', () => {
    const s = makeFullState();
    s.models[0].costs.tco399['hpc-1'].cpuHoursPerSimMonth = -1;
    expect(() => validateState(s)).toThrow(/cpuHoursPerSimMonth.*non-negative/);
  });

  it('rejects a non-string in dataPortfolios array', () => {
    const s = defaultState();
    (s.dataPortfolios as unknown[]).push(123);
    expect(() => validateState(s)).toThrow(/dataPortfolios\[3\].*expected string/);
  });
});

describe('migrate', () => {
  it('returns the same shape for a current-version state', () => {
    const s = defaultState();
    expect(migrate(s)).toEqual(s);
  });

  it('round-trips a fully populated current-version state', () => {
    const s = makeFullState();
    expect(migrate(s)).toEqual(s);
  });

  it('treats missing schemaVersion as v1 and succeeds', () => {
    const s: Record<string, unknown> = { ...defaultState() };
    delete s.schemaVersion;
    const out = migrate(s);
    expect(out.schemaVersion).toBe(1);
  });

  it('throws on a newer-than-supported schemaVersion', () => {
    const s = { ...defaultState(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    expect(() => migrate(s)).toThrow(/newer than supported/);
  });

  it('throws on non-object input', () => {
    expect(() => migrate(null)).toThrow(/expected an object/);
    expect(() => migrate('not state')).toThrow(/expected an object/);
  });

  it('still validates after migration (catches downstream shape errors)', () => {
    const s: Record<string, unknown> = { ...defaultState(), hpcs: 'not-an-array' };
    delete s.schemaVersion;
    expect(() => migrate(s)).toThrow(/hpcs.*expected array/);
  });
});
