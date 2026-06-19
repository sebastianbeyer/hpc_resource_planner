import { describe, expect, it } from 'vitest';
import {
  cascadeDeleteHpc,
  cascadeDeleteModel,
  describeHpcDelete,
  describeModelDelete
} from './cascade';
import { defaultState } from './schema';
import type { AppState } from './types';

function buildState(): AppState {
  return {
    ...defaultState(),
    hpcs: [
      {
        id: 'hpc-a',
        name: 'HPC A',
        storageBudgetTb: 100,
        periods: [
          { id: 'p1', label: '2026', cpuHoursBudget: 1000, gpuHoursBudget: 100 }
        ]
      },
      {
        id: 'hpc-b',
        name: 'HPC B',
        storageBudgetTb: 50,
        periods: [
          { id: 'p2', label: '2027', cpuHoursBudget: 500, gpuHoursBudget: 50 }
        ]
      }
    ],
    models: [
      {
        id: 'model-1',
        name: 'M1',
        costs: {
          tco79: {
            'hpc-a': {
              cpuHoursPerSimMonth: 10,
              gpuHoursPerSimMonth: 1
            },
            'hpc-b': {
              cpuHoursPerSimMonth: 20,
              gpuHoursPerSimMonth: 2
            }
          },
          tco399: {
            'hpc-a': {
              cpuHoursPerSimMonth: 100,
              gpuHoursPerSimMonth: 10
            }
          }
        },
        storageTbPerSimMonthByResolution: {
          tco79: { minimal: 0.1 },
          tco399: { minimal: 1 }
        }
      }
    ],
    simulations: [
      {
        id: 'sim-1',
        name: 'Sim 1',
        modelId: 'model-1',
        resolution: 'tco79',
        lengthYears: 1,
        ensembles: 1,
        dataPortfolio: 'minimal',
        overheadMultiplier: 1,
        completed: false
      },
      {
        id: 'sim-2',
        name: 'Sim 2 (on A)',
        modelId: 'model-1',
        resolution: 'tco79',
        lengthYears: 1,
        ensembles: 1,
        dataPortfolio: 'minimal',
        overheadMultiplier: 1,
        completed: false
      },
      {
        id: 'sim-3',
        name: 'Sim 3 (on B)',
        modelId: 'model-1',
        resolution: 'tco79',
        lengthYears: 1,
        ensembles: 1,
        dataPortfolio: 'minimal',
        overheadMultiplier: 1,
        completed: false
      }
    ],
    assignments: [
      {
        simulationId: 'sim-1',
        hpcId: 'hpc-a',
        periodSplit: { p1: 1 }
      },
      {
        simulationId: 'sim-3',
        hpcId: 'hpc-b',
        periodSplit: { p2: 1 }
      }
    ]
  };
}

describe('describeHpcDelete', () => {
  it('counts assignments and cost columns', () => {
    const impact = describeHpcDelete(buildState(), 'hpc-a');
    expect(impact.assignmentCount).toBe(1);
    // hpc-a appears under both tco79 and tco399, so 2 cost columns.
    expect(impact.computeCostColumnCount).toBe(2);
  });

  it('returns zero counts for an HPC with no references', () => {
    const impact = describeHpcDelete(defaultState(), 'nonexistent');
    expect(impact).toEqual({
      assignmentCount: 0,
      computeCostColumnCount: 0
    });
  });
});

describe('cascadeDeleteHpc', () => {
  it('removes the HPC itself', () => {
    const next = cascadeDeleteHpc(buildState(), 'hpc-a');
    expect(next.hpcs.map((h) => h.id)).toEqual(['hpc-b']);
  });

  it('strips assignments that reference the deleted HPC', () => {
    const next = cascadeDeleteHpc(buildState(), 'hpc-a');
    expect(next.assignments.map((a) => a.simulationId)).toEqual(['sim-3']);
  });

  it('drops the HPC column from every model compute-cost row', () => {
    const next = cascadeDeleteHpc(buildState(), 'hpc-a');
    const model = next.models[0];
    expect('hpc-a' in model.costs.tco79).toBe(false);
    expect('hpc-b' in model.costs.tco79).toBe(true);
    // tco399 only had hpc-a — should now be an empty row, not deleted.
    expect(model.costs.tco399).toEqual({});
    expect(model.storageTbPerSimMonthByResolution).toEqual({
      tco79: { minimal: 0.1 },
      tco399: { minimal: 1 }
    });
  });

  it('does not mutate the input state', () => {
    const state = buildState();
    const snapshot = JSON.parse(JSON.stringify(state));
    cascadeDeleteHpc(state, 'hpc-a');
    expect(state).toEqual(snapshot);
  });

  it('is a no-op for an unknown HPC id', () => {
    const state = buildState();
    const next = cascadeDeleteHpc(state, 'nonexistent');
    expect(next.hpcs).toEqual(state.hpcs);
    expect(next.assignments).toEqual(state.assignments);
    expect(next.models).toEqual(state.models);
  });
});

describe('describeModelDelete', () => {
  it('lists referencing simulation names', () => {
    const impact = describeModelDelete(buildState(), 'model-1');
    expect(impact.simulationCount).toBe(3);
    expect(impact.simulationNames).toContain('Sim 1');
  });

  it('returns zero count for an unreferenced model', () => {
    const impact = describeModelDelete(defaultState(), 'nonexistent');
    expect(impact.simulationCount).toBe(0);
    expect(impact.simulationNames).toEqual([]);
  });
});

describe('cascadeDeleteModel', () => {
  it('removes the model itself', () => {
    const next = cascadeDeleteModel(buildState(), 'model-1');
    expect(next.models).toEqual([]);
  });

  it('clears modelId on referencing sims but preserves the sims', () => {
    const next = cascadeDeleteModel(buildState(), 'model-1');
    expect(next.simulations).toHaveLength(3);
    for (const sim of next.simulations) {
      expect(sim.modelId).toBe('');
    }
  });

  it('preserves assignments tied to repointed sims', () => {
    const next = cascadeDeleteModel(buildState(), 'model-1');
    expect(next.assignments).toHaveLength(2);
  });

  it('does not mutate the input state', () => {
    const state = buildState();
    const snapshot = JSON.parse(JSON.stringify(state));
    cascadeDeleteModel(state, 'model-1');
    expect(state).toEqual(snapshot);
  });
});
