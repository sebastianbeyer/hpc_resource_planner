import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import HpcLane from './HpcLane.svelte';
import type { Assignment, Hpc, Model, Simulation } from '$lib/types';
import type { HpcRollup } from '$lib/calc/rollup';

const models: Model[] = [
  { id: 'm1', name: 'IFS', costs: {}, storageTbPerSimMonthByResolution: {} }
];

const hpc: Hpc = {
  id: 'h1',
  name: 'Levante',
  storageBudgetTb: 100,
  periods: [
    { id: 'p1', label: '2026', cpuHoursBudget: 1000, gpuHoursBudget: 100 },
    { id: 'p2', label: '2027', cpuHoursBudget: 2000, gpuHoursBudget: 200 }
  ]
};

const rollup: HpcRollup = {
  storageUsedTb: 50,
  storageCompletedTb: 10,
  storageBudgetTb: 100,
  storageOverBudget: false,
  storageSegments: [],
  periods: {
    p1: {
      cpuUsed: 100,
      cpuCompleted: 25,
      cpuBudget: 1000,
      cpuOverBudget: false,
      cpuSegments: [],
      gpuUsed: 10,
      gpuCompleted: 2,
      gpuBudget: 100,
      gpuOverBudget: false,
      gpuSegments: []
    },
    p2: {
      cpuUsed: 200,
      cpuCompleted: 0,
      cpuBudget: 2000,
      cpuOverBudget: false,
      cpuSegments: [],
      gpuUsed: 20,
      gpuCompleted: 0,
      gpuBudget: 200,
      gpuOverBudget: false,
      gpuSegments: []
    }
  }
};

const sims: Simulation[] = [
  {
    id: 's1',
    name: 'sim-a',
    modelId: 'm1',
    resolution: 'tco79',
    lengthYears: 1,
    ensembles: 1,
    dataPortfolio: 'standard',
    overheadMultiplier: 1.15,
    completed: false
  }
];

const assignments: Assignment[] = [
  { simulationId: 's1', hpcId: 'h1', periodSplit: { p1: 1 } }
];

describe('HpcLane', () => {
  it('renders the HPC name', () => {
    const { container } = render(HpcLane, {
      props: {
        hpc,
        sims: [],
        models,
        hpcs: [hpc],
        assignments: [],
        rollup,
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onSplitChange: vi.fn(),
        onCompletedChange: vi.fn()
      }
    });
    expect(container.textContent).toMatch(/Levante/);
  });

  it('renders 2 budget meters per period (CPU + GPU) plus 1 storage meter', () => {
    const { getAllByTestId } = render(HpcLane, {
      props: {
        hpc,
        sims: [],
        models,
        hpcs: [hpc],
        assignments: [],
        rollup,
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onSplitChange: vi.fn(),
        onCompletedChange: vi.fn()
      }
    });
    // 2 periods × 2 (CPU + GPU) + 1 storage = 5 meters
    expect(getAllByTestId('budget-meter').length).toBe(5);
  });

  it('renders an embedded SimulationCard for each assigned sim', () => {
    const { getAllByTestId } = render(HpcLane, {
      props: {
        hpc,
        sims,
        models,
        hpcs: [hpc],
        assignments,
        rollup,
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onSplitChange: vi.fn(),
        onCompletedChange: vi.fn()
      }
    });
    expect(getAllByTestId('simulation-card').length).toBe(1);
  });

  it('shows empty state when no sims are assigned', () => {
    const { getByTestId } = render(HpcLane, {
      props: {
        hpc,
        sims: [],
        models,
        hpcs: [hpc],
        assignments: [],
        rollup,
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onSplitChange: vi.fn(),
        onCompletedChange: vi.fn()
      }
    });
    expect(getByTestId('lane-empty').textContent).toMatch(/No sims/);
  });

  it('separates completed assigned sims into a collapsable Done section', async () => {
    const mixed: Simulation[] = [
      { ...sims[0], id: 's1', name: 'pending' },
      {
        id: 's2',
        name: 'done',
        modelId: 'm1',
        resolution: 'tco79',
        lengthYears: 1,
        ensembles: 1,
        dataPortfolio: 'standard',
        overheadMultiplier: 1.15,
        completed: true
      }
    ];
    const { getByTestId, queryByTestId, container } = render(HpcLane, {
      props: {
        hpc,
        sims: mixed,
        models,
        hpcs: [hpc],
        assignments: [
          { simulationId: 's1', hpcId: 'h1', periodSplit: { p1: 1 } },
          { simulationId: 's2', hpcId: 'h1', periodSplit: { p1: 1 } }
        ],
        rollup,
        onAssign: vi.fn(),
        onUnassign: vi.fn(),
        onSplitChange: vi.fn(),
        onCompletedChange: vi.fn()
      }
    });
    const toggle = getByTestId('lane-toggle-done');
    expect(toggle.textContent).toMatch(/Done/);
    expect(toggle.textContent).toMatch(/1/);
    expect(container.querySelectorAll('[data-testid="lane-done-section"] [data-testid="simulation-card"]').length).toBe(1);
    await fireEvent.click(toggle);
    expect(queryByTestId('lane-done-section')).toBeNull();
  });

  it('fires onAssign when a sim id is dropped on the lane', () => {
    const onAssign = vi.fn();
    const { getByTestId } = render(HpcLane, {
      props: {
        hpc,
        sims: [],
        models,
        hpcs: [hpc],
        assignments: [],
        rollup,
        onAssign,
        onUnassign: vi.fn(),
        onSplitChange: vi.fn(),
        onCompletedChange: vi.fn()
      }
    });
    const lane = getByTestId('hpc-lane');
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
    lane.dispatchEvent(drop);
    expect(onAssign).toHaveBeenCalledWith('s1', 'h1');
  });
});
