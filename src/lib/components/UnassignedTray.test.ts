import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import UnassignedTray from './UnassignedTray.svelte';
import type { Hpc, Model, Simulation } from '$lib/types';

const models: Model[] = [
  { id: 'm1', name: 'IFS', costs: {}, storageTbPerSimMonthByResolution: {} }
];
const hpcs: Hpc[] = [
  {
    id: 'h1',
    name: 'Levante',
    storageBudgetTb: 100,
    periods: [{ id: 'p1', label: '2026', cpuHoursBudget: 0, gpuHoursBudget: 0 }]
  }
];

function sim(overrides: Partial<Simulation> = {}): Simulation {
  return {
    id: 's1',
    name: 'Tray sim',
    modelId: 'm1',
    resolution: 'tco79',
    lengthYears: 1,
    ensembles: 1,
    dataPortfolio: 'standard',
    overheadMultiplier: 1.15,
    locked: false,
    completed: false,
    ...overrides
  };
}

describe('UnassignedTray', () => {
  it('renders the empty state when sims is empty', () => {
    const { getByTestId, queryByTestId } = render(UnassignedTray, {
      props: { sims: [], models, hpcs, onAssign: vi.fn() }
    });
    expect(getByTestId('tray-empty').textContent).toMatch(/All sims assigned/);
    expect(queryByTestId('simulation-card')).toBeNull();
  });

  it('renders one SimulationCard per sim when non-empty', () => {
    const sims = [
      sim({ id: 's1', name: 'one' }),
      sim({ id: 's2', name: 'two' })
    ];
    const { getAllByTestId, queryByTestId } = render(UnassignedTray, {
      props: { sims, models, hpcs, onAssign: vi.fn() }
    });
    expect(queryByTestId('tray-empty')).toBeNull();
    expect(getAllByTestId('simulation-card').length).toBe(2);
  });

  it('shows the unassigned count in the header', () => {
    const sims = [sim({ id: 's1' }), sim({ id: 's2' }), sim({ id: 's3' })];
    const { getByTestId } = render(UnassignedTray, {
      props: { sims, models, hpcs, onAssign: vi.fn() }
    });
    const tray = getByTestId('unassigned-tray');
    expect(tray.textContent).toMatch(/3/);
  });
});
