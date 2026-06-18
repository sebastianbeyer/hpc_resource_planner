import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SimulationCard from './SimulationCard.svelte';
import type { Assignment, Hpc, Model, Simulation } from '$lib/types';

const models: Model[] = [{ id: 'm1', name: 'IFS', costs: {} }];
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
    name: 'Test sim',
    modelId: 'm1',
    resolution: 'tco79',
    lengthYears: 1,
    ensembles: 1,
    dataPortfolio: 'standard',
    overheadMultiplier: 1.15,
    locked: false,
    ...overrides
  };
}

describe('SimulationCard', () => {
  it('renders the sim name and model', () => {
    const { container } = render(SimulationCard, {
      props: { sim: sim(), models, hpcs }
    });
    expect(container.textContent).toMatch(/Test sim/);
    expect(container.textContent).toMatch(/IFS/);
  });

  it('renders a lock icon when sim.locked is true', () => {
    const { getByTestId } = render(SimulationCard, {
      props: { sim: sim({ locked: true }), models, hpcs }
    });
    expect(getByTestId('lock-icon')).toBeTruthy();
  });

  it('renders the package label as a badge when set', () => {
    const { getByTestId } = render(SimulationCard, {
      props: { sim: sim({ packageLabel: 'pkg-A' }), models, hpcs }
    });
    expect(getByTestId('package-badge').textContent).toMatch(/pkg-A/);
  });

  it('in unassigned tray, shows an Assign-to button and fires onAssign', async () => {
    const onAssign = vi.fn();
    const { getByTestId, getAllByTestId } = render(SimulationCard, {
      props: { sim: sim(), models, hpcs, onAssign }
    });
    await fireEvent.click(getByTestId('assign-to'));
    const opts = getAllByTestId('assign-option');
    expect(opts.length).toBe(1);
    await fireEvent.click(opts[0]);
    expect(onAssign).toHaveBeenCalledWith('h1');
  });

  it('in an HPC lane, shows Unassign for non-locked sims and fires onUnassign', async () => {
    const onUnassign = vi.fn();
    const assignment: Assignment = {
      simulationId: 's1',
      hpcId: 'h1',
      periodSplit: { p1: 1 }
    };
    const { getByTestId } = render(SimulationCard, {
      props: { sim: sim(), models, hpcs, hpcId: 'h1', assignment, onUnassign }
    });
    await fireEvent.click(getByTestId('unassign'));
    expect(onUnassign).toHaveBeenCalled();
  });

  it('in an HPC lane, hides Unassign for locked sims', () => {
    const assignment: Assignment = {
      simulationId: 's1',
      hpcId: 'h1',
      periodSplit: { p1: 1 }
    };
    const { queryByTestId } = render(SimulationCard, {
      props: {
        sim: sim({ locked: true }),
        models,
        hpcs,
        hpcId: 'h1',
        assignment
      }
    });
    expect(queryByTestId('unassign')).toBeNull();
  });

  it('renders a compact split string for the assignment', () => {
    const assignment: Assignment = {
      simulationId: 's1',
      hpcId: 'h1',
      periodSplit: { p1: 1 }
    };
    const { getByTestId } = render(SimulationCard, {
      props: { sim: sim(), models, hpcs, hpcId: 'h1', assignment }
    });
    expect(getByTestId('card-split').textContent).toMatch(/2026/);
    expect(getByTestId('card-split').textContent).toMatch(/100%/);
  });
});
