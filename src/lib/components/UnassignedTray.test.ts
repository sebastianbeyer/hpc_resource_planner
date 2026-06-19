import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
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
    completed: false,
    ...overrides
  };
}

describe('UnassignedTray', () => {
  it('renders the empty state when sims is empty', () => {
    const { getByTestId, queryByTestId } = render(UnassignedTray, {
      props: { sims: [], models, hpcs, onAssignToPeriod: vi.fn(), onUnassign: vi.fn(), onCompletedChange: vi.fn() }
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
      props: { sims, models, hpcs, onAssignToPeriod: vi.fn(), onUnassign: vi.fn(), onCompletedChange: vi.fn() }
    });
    expect(queryByTestId('tray-empty')).toBeNull();
    expect(getAllByTestId('simulation-card').length).toBe(2);
  });

  it('shows the unassigned count in the header', () => {
    const sims = [sim({ id: 's1' }), sim({ id: 's2' }), sim({ id: 's3' })];
    const { getByTestId } = render(UnassignedTray, {
      props: { sims, models, hpcs, onAssignToPeriod: vi.fn(), onUnassign: vi.fn(), onCompletedChange: vi.fn() }
    });
    const tray = getByTestId('unassigned-tray');
    expect(tray.textContent).toMatch(/3/);
  });

  it('separates completed sims into a collapsable Done section', async () => {
    const sims = [
      sim({ id: 's1', name: 'pending-one' }),
      sim({ id: 's2', name: 'done-one', completed: true }),
      sim({ id: 's3', name: 'done-two', completed: true })
    ];
    const { getByTestId, queryByTestId, container } = render(UnassignedTray, {
      props: { sims, models, hpcs, onAssignToPeriod: vi.fn(), onUnassign: vi.fn(), onCompletedChange: vi.fn() }
    });
    const toggle = getByTestId('tray-toggle-done');
    expect(toggle.textContent).toMatch(/Done/);
    expect(toggle.textContent).toMatch(/2/);
    // Expanded by default
    expect(getByTestId('tray-done-section')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="tray-done-section"] [data-testid="simulation-card"]').length).toBe(2);

    await fireEvent.click(toggle);
    expect(queryByTestId('tray-done-section')).toBeNull();
  });

  it('does not render the Done toggle when no sims are completed', () => {
    const sims = [sim({ id: 's1' }), sim({ id: 's2' })];
    const { queryByTestId } = render(UnassignedTray, {
      props: { sims, models, hpcs, onAssignToPeriod: vi.fn(), onUnassign: vi.fn(), onCompletedChange: vi.fn() }
    });
    expect(queryByTestId('tray-toggle-done')).toBeNull();
  });

  it('fires onUnassign when a sim id is dropped on the tray', () => {
    const onUnassign = vi.fn();
    const { getByTestId } = render(UnassignedTray, {
      props: { sims: [], models, hpcs, onAssignToPeriod: vi.fn(), onUnassign, onCompletedChange: vi.fn() }
    });
    const tray = getByTestId('unassigned-tray');
    const data: Record<string, string> = {
      'application/x-sim-id': 's1',
      'text/plain': 's1'
    };
    const dt = {
      getData: (k: string) => data[k] ?? '',
      dropEffect: ''
    };
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: dt });
    tray.dispatchEvent(drop);
    expect(onUnassign).toHaveBeenCalledWith('s1');
  });
});
