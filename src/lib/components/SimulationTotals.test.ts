import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import SimulationTotals from './SimulationTotals.svelte';
import type { Hpc, Model, Simulation } from '$lib/types';

describe('SimulationTotals', () => {
  it('computes per-HPC CPU/GPU/storage with overhead on compute but not storage', () => {
    const hpcs: Hpc[] = [
      { id: 'h1', name: 'Levante', storageBudgetTb: 500, periods: [] }
    ];
    const model: Model = {
      id: 'm1',
      name: 'IFS',
      costs: {
        tco79: {
          h1: {
            cpuHoursPerSimMonth: 100,
            gpuHoursPerSimMonth: 10
          }
        }
      },
      storageTbPerSimMonthByResolution: {
        tco79: { standard: 0.5 }
      }
    };
    const sim: Simulation = {
      id: 's1',
      name: 'test',
      modelId: 'm1',
      resolution: 'tco79',
      lengthYears: 2,
      ensembles: 1,
      dataPortfolio: 'standard',
      overheadMultiplier: 1.15,
      locked: false,
      completed: false
    };

    const { getByTestId } = render(SimulationTotals, {
      props: { sim, models: [model], hpcs }
    });

    // 2 years × 12 months = 24 months
    // CPU: 100 × 24 × 1.15 = 2760
    // GPU: 10 × 24 × 1.15 = 276
    // Storage: 0.5 × 24 = 12  (no overhead on storage)
    expect(getByTestId('totals-cpu').textContent?.trim()).toBe('2,760');
    expect(getByTestId('totals-gpu').textContent?.trim()).toBe('276');
    expect(getByTestId('totals-storage').textContent?.trim()).toBe('12');
  });

  it('renders an em-dash for HPCs where the cost cell is missing', () => {
    const hpcs: Hpc[] = [
      { id: 'h1', name: 'Levante', storageBudgetTb: 500, periods: [] }
    ];
    const model: Model = {
      id: 'm1',
      name: 'IFS',
      costs: {},
      storageTbPerSimMonthByResolution: { tco79: { standard: 0.5 } }
    };
    const sim: Simulation = {
      id: 's1',
      name: 'test',
      modelId: 'm1',
      resolution: 'tco79',
      lengthYears: 1,
      ensembles: 1,
      dataPortfolio: 'standard',
      overheadMultiplier: 1.15,
      locked: false,
      completed: false
    };

    const { getByTestId } = render(SimulationTotals, {
      props: { sim, models: [model], hpcs }
    });

    const cpu = getByTestId('totals-cpu');
    expect(cpu.getAttribute('data-missing')).toBe('true');
    expect(cpu.textContent?.trim()).toBe('—');
    expect(getByTestId('totals-storage').textContent?.trim()).toBe('6');
  });

  it('shows a helpful empty state when no model is matched', () => {
    const hpcs: Hpc[] = [
      { id: 'h1', name: 'Levante', storageBudgetTb: 500, periods: [] }
    ];
    const sim: Simulation = {
      id: 's1',
      name: 'test',
      modelId: '',
      resolution: '',
      lengthYears: 1,
      ensembles: 1,
      dataPortfolio: '',
      overheadMultiplier: 1.15,
      locked: false,
      completed: false
    };

    const { container } = render(SimulationTotals, {
      props: { sim, models: [], hpcs }
    });
    expect(container.textContent).toMatch(/Pick a model/i);
  });
});
