import { describe, expect, it } from 'vitest';
import type { AppState } from '../types';
import { isOverBudget, rollup } from './rollup';

/**
 * Build a small but realistic AppState:
 *   - one HPC with two periods + a finite storage budget
 *   - one model with a single (resolution, hpc) cost cell
 *   - three sims:
 *       * sim-explicit: explicit 50/50 assignment
 *       * sim-pinned-p1: explicit 100% on p1 (was a locked-and-pinned sim
 *                       in older schemas — see the v3→v4 migration)
 *       * sim-historic: zeroCompute (storage-only)
 */
function buildState(): AppState {
  return {
    schemaVersion: 4,
    dataPortfolios: ['standard'],
    resolutions: ['tco79'],
    hpcs: [
      {
        id: 'hpc1',
        name: 'HPC One',
        storageBudgetTb: 100,
        periods: [
          {
            id: 'p1',
            label: '2026',
            cpuHoursBudget: 10_000,
            gpuHoursBudget: 1_000
          },
          {
            id: 'p2',
            label: '2027',
            cpuHoursBudget: 10_000,
            gpuHoursBudget: 1_000
          }
        ]
      }
    ],
    models: [
      {
        id: 'm1',
        name: 'Model One',
        costs: {
          tco79: {
            hpc1: {
              cpuHoursPerSimMonth: 100,
              gpuHoursPerSimMonth: 10
            }
          }
        },
        storageTbPerSimMonthByResolution: {
          tco79: { standard: 0.5 }
        }
      }
    ],
    simulations: [
      {
        id: 'sim-explicit',
        name: 'Explicit',
        modelId: 'm1',
        resolution: 'tco79',
        lengthYears: 1,
        ensembles: 1,
        dataPortfolio: 'standard',
        overheadMultiplier: 1,
        completed: false
      },
      {
        id: 'sim-pinned-p1',
        name: 'Pinned to p1',
        modelId: 'm1',
        resolution: 'tco79',
        lengthYears: 1,
        ensembles: 1,
        dataPortfolio: 'standard',
        overheadMultiplier: 1,
        completed: false
      },
      {
        id: 'sim-historic',
        name: 'Historic',
        modelId: 'm1',
        resolution: 'tco79',
        lengthYears: 1,
        ensembles: 1,
        dataPortfolio: 'standard',
        overheadMultiplier: 1,
        completed: false,
        zeroCompute: true
      }
    ],
    assignments: [
      {
        simulationId: 'sim-explicit',
        hpcId: 'hpc1',
        periodSplit: { p1: 0.5, p2: 0.5 }
      },
      {
        simulationId: 'sim-pinned-p1',
        hpcId: 'hpc1',
        periodSplit: { p1: 1 }
      },
      {
        simulationId: 'sim-historic',
        hpcId: 'hpc1',
        periodSplit: { p1: 1 }
      }
    ]
  };
}

describe('rollup', () => {
  it('initialises HPCs even with zero assignments', () => {
    const state = buildState();
    state.assignments = [];
    state.simulations = [];
    const r = rollup(state);
    expect(r.hpc1.storageUsedTb).toBe(0);
    expect(r.hpc1.storageCompletedTb).toBe(0);
    expect(r.hpc1.storageBudgetTb).toBe(100);
    expect(r.hpc1.periods.p1.cpuUsed).toBe(0);
    expect(r.hpc1.periods.p1.cpuCompleted).toBe(0);
    expect(r.hpc1.periods.p1.cpuBudget).toBe(10_000);
    expect(r.hpc1.periods.p1.gpuBudget).toBe(1_000);
  });

  it('rolls up an end-to-end state with explicit, pinned, and historic sims', () => {
    const r = rollup(buildState());
    const hpc = r.hpc1;

    // Per sim (12 months each):
    //   sim-explicit:    cpu 1200, gpu 120, storage 6 — split 50/50
    //   sim-pinned-p1:   cpu 1200, gpu 120, storage 6 — explicit 100% on p1
    //   sim-historic:    cpu 0,    gpu 0,   storage 6 — explicit 100% on p1

    // Storage = 6 + 6 + 6 = 18
    expect(hpc.storageUsedTb).toBe(18);
    expect(hpc.storageCompletedTb).toBe(0);

    // p1 compute = 1200/2 (explicit) + 1200 (pinned) + 0 (historic)
    //            = 600 + 1200 = 1800
    expect(hpc.periods.p1.cpuUsed).toBe(1800);
    expect(hpc.periods.p1.cpuCompleted).toBe(0);
    expect(hpc.periods.p1.gpuUsed).toBe(180);
    expect(hpc.periods.p1.gpuCompleted).toBe(0);

    // p2 compute = 1200/2 (explicit) only
    expect(hpc.periods.p2.cpuUsed).toBe(600);
    expect(hpc.periods.p2.cpuCompleted).toBe(0);
    expect(hpc.periods.p2.gpuUsed).toBe(60);
    expect(hpc.periods.p2.gpuCompleted).toBe(0);

    // Nothing should be over budget at these numbers.
    expect(hpc.storageOverBudget).toBe(false);
    expect(hpc.periods.p1.cpuOverBudget).toBe(false);
    expect(hpc.periods.p1.gpuOverBudget).toBe(false);
    expect(hpc.periods.p2.cpuOverBudget).toBe(false);
    expect(hpc.periods.p2.gpuOverBudget).toBe(false);
    expect(isOverBudget(r)).toBe(false);
  });

  it('flags over-budget when used exceeds budget on any axis', () => {
    const state = buildState();
    // Crank ensembles way up on the explicit sim → blow CPU/GPU/storage budgets.
    state.simulations[0].ensembles = 100;
    const r = rollup(state);
    const hpc = r.hpc1;
    // sim-explicit now: months = 1*12*100 = 1200, cpu = 120_000 (60_000 per period)
    expect(hpc.periods.p1.cpuOverBudget).toBe(true);
    expect(hpc.periods.p2.cpuOverBudget).toBe(true);
    expect(hpc.periods.p1.gpuOverBudget).toBe(true);
    expect(hpc.storageOverBudget).toBe(true);
    expect(isOverBudget(r)).toBe(true);
  });

  it('tracks completed simulation usage separately from total usage', () => {
    const state = buildState();
    state.simulations[0].completed = true;
    state.simulations = [state.simulations[0]];
    state.assignments = [state.assignments[0]];

    const r = rollup(state);

    expect(r.hpc1.storageUsedTb).toBe(6);
    expect(r.hpc1.storageCompletedTb).toBe(6);
    expect(r.hpc1.periods.p1.cpuUsed).toBe(600);
    expect(r.hpc1.periods.p1.cpuCompleted).toBe(600);
    expect(r.hpc1.periods.p1.gpuUsed).toBe(60);
    expect(r.hpc1.periods.p1.gpuCompleted).toBe(60);
    expect(r.hpc1.periods.p2.cpuUsed).toBe(600);
    expect(r.hpc1.periods.p2.cpuCompleted).toBe(600);
    expect(r.hpc1.periods.p2.gpuUsed).toBe(60);
    expect(r.hpc1.periods.p2.gpuCompleted).toBe(60);
  });

  it('silently ignores periodSplit keys that do not exist on the target HPC', () => {
    const state = buildState();
    state.assignments = [
      {
        simulationId: 'sim-explicit',
        hpcId: 'hpc1',
        periodSplit: { p1: 0.5, 'p-bogus': 0.5 }
      }
    ];
    state.simulations = [state.simulations[0]];
    const r = rollup(state);
    // Only p1 gets the 0.5 share.
    expect(r.hpc1.periods.p1.cpuUsed).toBe(600);
    expect(r.hpc1.periods.p2.cpuUsed).toBe(0);
    // No stale-period bucket should have materialised.
    expect(Object.keys(r.hpc1.periods).sort()).toEqual(['p1', 'p2']);
  });

  it('skips assignments pointing at a missing HPC or sim or model', () => {
    const state = buildState();
    state.assignments = [
      { simulationId: 'sim-missing', hpcId: 'hpc1', periodSplit: { p1: 1 } },
      { simulationId: 'sim-explicit', hpcId: 'hpc-missing', periodSplit: { p1: 1 } }
    ];
    state.simulations = [state.simulations[0]]; // keep sim-explicit (no model issue here)
    const r = rollup(state);
    expect(r.hpc1.periods.p1.cpuUsed).toBe(0);
    expect(r.hpc1.storageUsedTb).toBe(0);
  });

  it('skips an assignment whose sim references a missing model', () => {
    const state = buildState();
    state.simulations[0].modelId = 'm-missing';
    state.simulations = [state.simulations[0]];
    state.assignments = [
      { simulationId: 'sim-explicit', hpcId: 'hpc1', periodSplit: { p1: 1 } }
    ];
    const r = rollup(state);
    expect(r.hpc1.periods.p1.cpuUsed).toBe(0);
    expect(r.hpc1.storageUsedTb).toBe(0);
  });
});

describe('rollup segments', () => {
  it('emits one segment per sim per axis, tagged with model + completed', () => {
    const state = buildState();
    // Mark sim-explicit as completed so we can check the flag flows through.
    state.simulations[0].completed = true;
    const r = rollup(state);
    const hpc = r.hpc1;

    // Storage: sim-explicit (6), sim-pinned-p1 (6), sim-historic (6) → 3 segments.
    expect(hpc.storageSegments.map((s) => s.simulationId).sort()).toEqual([
      'sim-explicit',
      'sim-historic',
      'sim-pinned-p1'
    ]);
    const storageExplicit = hpc.storageSegments.find(
      (s) => s.simulationId === 'sim-explicit'
    )!;
    expect(storageExplicit.modelName).toBe('Model One');
    expect(storageExplicit.value).toBe(6);
    expect(storageExplicit.completed).toBe(true);

    // p1 CPU: sim-explicit (600) + sim-pinned-p1 (1200). sim-historic is
    // zeroCompute so it contributes nothing to compute segments.
    const p1CpuIds = hpc.periods.p1.cpuSegments.map((s) => s.simulationId).sort();
    expect(p1CpuIds).toEqual(['sim-explicit', 'sim-pinned-p1']);
    const p1CpuExplicit = hpc.periods.p1.cpuSegments.find(
      (s) => s.simulationId === 'sim-explicit'
    )!;
    expect(p1CpuExplicit.value).toBe(600);

    // p2 CPU: only sim-explicit (600). sim-pinned-p1 is fully on p1.
    expect(hpc.periods.p2.cpuSegments.map((s) => s.simulationId)).toEqual([
      'sim-explicit'
    ]);

    // GPU segments mirror the CPU ones but with gpu hours.
    expect(hpc.periods.p1.gpuSegments.map((s) => s.simulationId).sort()).toEqual([
      'sim-explicit',
      'sim-pinned-p1'
    ]);
  });

  it('omits zero-value segments (e.g. zeroCompute sims contribute no CPU/GPU segment)', () => {
    const state = buildState();
    // Keep only the historic sim.
    state.simulations = state.simulations.filter((s) => s.id === 'sim-historic');
    state.assignments = state.assignments.filter(
      (a) => a.simulationId === 'sim-historic'
    );
    const r = rollup(state);
    expect(r.hpc1.periods.p1.cpuSegments).toHaveLength(0);
    expect(r.hpc1.periods.p1.gpuSegments).toHaveLength(0);
    // Storage still gets a segment.
    expect(r.hpc1.storageSegments).toHaveLength(1);
  });
});

describe('isOverBudget', () => {
  it('returns false on a fresh rollup of an empty state', () => {
    const r = rollup({
      schemaVersion: 4,
      hpcs: [],
      models: [],
      simulations: [],
      assignments: [],
      dataPortfolios: [],
      resolutions: []
    });
    expect(isOverBudget(r)).toBe(false);
  });
});
