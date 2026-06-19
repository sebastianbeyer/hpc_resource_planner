import { describe, expect, it } from 'vitest';
import type { Model, Simulation } from '../types';
import { packageCost, simulationCost } from './cost';

function makeModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'm1',
    name: 'Test Model',
    costs: {
      tco79: {
        hpc1: {
          cpuHoursPerSimMonth: 100,
          gpuHoursPerSimMonth: 10
        }
      }
    },
    storageTbPerSimMonthByResolution: {
      tco79: {
        standard: 0.5,
        extended: 1.0
      }
    },
    ...overrides
  };
}

function makeSim(overrides: Partial<Simulation> = {}): Simulation {
  return {
    id: 's1',
    name: 'Test Sim',
    modelId: 'm1',
    resolution: 'tco79',
    lengthYears: 1,
    ensembles: 1,
    dataPortfolio: 'standard',
    overheadMultiplier: 1,
    locked: false,
    completed: false,
    ...overrides
  };
}

describe('simulationCost', () => {
  it('does basic month math for a 1-year, 1-ensemble sim', () => {
    const sim = makeSim();
    const model = makeModel();
    const r = simulationCost(sim, model, 'hpc1');
    // 1 * 12 * 1 = 12 months
    // cpu = 100 * 12 * 1 = 1200
    // gpu = 10 * 12 * 1  = 120
    // storage = 0.5 * 12 = 6
    expect(r.cpuHours).toBe(1200);
    expect(r.gpuHours).toBe(120);
    expect(r.storageTb).toBe(6);
    expect(r.missingCost).toBeUndefined();
  });

  it('multiplies months by ensembles and length', () => {
    const sim = makeSim({ lengthYears: 5, ensembles: 3 });
    const model = makeModel();
    const r = simulationCost(sim, model, 'hpc1');
    // months = 5 * 12 * 3 = 180
    expect(r.cpuHours).toBe(100 * 180);
    expect(r.gpuHours).toBe(10 * 180);
    expect(r.storageTb).toBe(0.5 * 180);
  });

  it('applies overheadMultiplier to compute but NOT to storage', () => {
    const sim = makeSim({ overheadMultiplier: 1.15 });
    const model = makeModel();
    const r = simulationCost(sim, model, 'hpc1');
    expect(r.cpuHours).toBeCloseTo(100 * 12 * 1.15);
    expect(r.gpuHours).toBeCloseTo(10 * 12 * 1.15);
    // Storage is untouched by overhead.
    expect(r.storageTb).toBe(0.5 * 12);
  });

  it('zeroCompute zeros compute but keeps storage', () => {
    const sim = makeSim({ zeroCompute: true, overheadMultiplier: 1.15 });
    const model = makeModel();
    const r = simulationCost(sim, model, 'hpc1');
    expect(r.cpuHours).toBe(0);
    expect(r.gpuHours).toBe(0);
    expect(r.storageTb).toBe(0.5 * 12);
  });

  it('returns flagged zero when the (resolution, hpc) cell is missing', () => {
    const sim = makeSim({ resolution: 'tco399' });
    const model = makeModel();
    const r = simulationCost(sim, model, 'hpc1');
    expect(r).toEqual({ cpuHours: 0, gpuHours: 0, storageTb: 0, missingCost: true });
  });

  it('returns flagged zero compute but keeps storage when the HPC compute cell is missing', () => {
    const sim = makeSim();
    const model = makeModel();
    const r = simulationCost(sim, model, 'hpc-unknown');
    expect(r.missingCost).toBe(true);
    expect(r.cpuHours).toBe(0);
    expect(r.gpuHours).toBe(0);
    expect(r.storageTb).toBe(6);
  });

  it('missing dataPortfolio key contributes zero storage but normal compute', () => {
    const sim = makeSim({ dataPortfolio: 'unknown-portfolio' });
    const model = makeModel();
    const r = simulationCost(sim, model, 'hpc1');
    expect(r.cpuHours).toBe(1200);
    expect(r.gpuHours).toBe(120);
    expect(r.storageTb).toBe(0);
    expect(r.missingCost).toBeUndefined();
  });
});

describe('packageCost', () => {
  it('sums multiple sims using their models', () => {
    const model = makeModel();
    const sims = [makeSim({ id: 's1' }), makeSim({ id: 's2', lengthYears: 2 })];
    const r = packageCost(sims, [model], 'hpc1');
    // sim1: cpu 1200, gpu 120, storage 6
    // sim2: cpu 2400, gpu 240, storage 12
    expect(r.cpuHours).toBe(3600);
    expect(r.gpuHours).toBe(360);
    expect(r.storageTb).toBe(18);
    expect(r.missingCost).toBeUndefined();
  });

  it('flags missingCost when a sims model is not in the list', () => {
    const sims = [makeSim({ modelId: 'm-missing' })];
    const r = packageCost(sims, [], 'hpc1');
    expect(r.cpuHours).toBe(0);
    expect(r.gpuHours).toBe(0);
    expect(r.storageTb).toBe(0);
    expect(r.missingCost).toBe(true);
  });

  it('propagates missingCost when a sim has no cost cell, while still summing the good ones', () => {
    const model = makeModel();
    const sims = [
      makeSim({ id: 's1' }), // good
      makeSim({ id: 's2', resolution: 'tco399' }) // missing cost cell
    ];
    const r = packageCost(sims, [model], 'hpc1');
    expect(r.cpuHours).toBe(1200);
    expect(r.gpuHours).toBe(120);
    expect(r.storageTb).toBe(6);
    expect(r.missingCost).toBe(true);
  });

  it('returns clean zeros for an empty sims list', () => {
    const r = packageCost([], [], 'hpc1');
    expect(r).toEqual({ cpuHours: 0, gpuHours: 0, storageTb: 0 });
  });
});
