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

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    hpc,
    sims: [] as Simulation[],
    models,
    hpcs: [hpc],
    assignments: [] as Assignment[],
    rollup,
    onAssignToPeriod: vi.fn(),
    onUnassign: vi.fn(),
    onSplitChange: vi.fn(),
    onCompletedChange: vi.fn(),
    ...overrides
  };
}

describe('HpcLane', () => {
  it('renders the HPC name', () => {
    const { container } = render(HpcLane, { props: baseProps() });
    expect(container.textContent).toMatch(/Levante/);
  });

  it('renders 2 budget meters per period (CPU + GPU) plus 1 storage meter', () => {
    const { getAllByTestId } = render(HpcLane, { props: baseProps() });
    // 2 periods × 2 (CPU + GPU) + 1 storage = 5 meters
    expect(getAllByTestId('budget-meter').length).toBe(5);
  });

  it('renders one period-section per period', () => {
    const { getAllByTestId } = render(HpcLane, { props: baseProps() });
    expect(getAllByTestId('period-section').length).toBe(2);
  });

  it('only shows an assigned sim in the period sections where it has a non-zero share', () => {
    const { container } = render(HpcLane, {
      props: baseProps({ sims, assignments })
    });
    // p1 has 100% — should render the card
    const p1 = container.querySelector('[data-testid="period-section"][data-period-id="p1"]');
    expect(p1?.querySelectorAll('[data-testid="simulation-card"]').length).toBe(1);
    // p2 has 0% — should render the empty hint instead
    const p2 = container.querySelector('[data-testid="period-section"][data-period-id="p2"]');
    expect(p2?.querySelectorAll('[data-testid="simulation-card"]').length).toBe(0);
    expect(p2?.querySelector('[data-testid="period-empty"]')).toBeTruthy();
  });

  it('renders the same sim in BOTH period sections when split across periods', () => {
    const splitAssignments: Assignment[] = [
      { simulationId: 's1', hpcId: 'h1', periodSplit: { p1: 0.5, p2: 0.5 } }
    ];
    const { container } = render(HpcLane, {
      props: baseProps({ sims, assignments: splitAssignments })
    });
    const p1 = container.querySelector('[data-testid="period-section"][data-period-id="p1"]');
    const p2 = container.querySelector('[data-testid="period-section"][data-period-id="p2"]');
    expect(p1?.querySelectorAll('[data-testid="simulation-card"]').length).toBe(1);
    expect(p2?.querySelectorAll('[data-testid="simulation-card"]').length).toBe(1);
  });

  it('shows a per-period empty hint when no sims land in that period', () => {
    const { getAllByTestId } = render(HpcLane, { props: baseProps() });
    const hints = getAllByTestId('period-empty');
    expect(hints.length).toBe(2);
    expect(hints[0].textContent).toMatch(/Drop a card here/);
  });

  it('separates completed sims into a collapsable Done section within their period', async () => {
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
    const mixedAssignments: Assignment[] = [
      { simulationId: 's1', hpcId: 'h1', periodSplit: { p1: 1 } },
      { simulationId: 's2', hpcId: 'h1', periodSplit: { p1: 1 } }
    ];
    const { container } = render(HpcLane, {
      props: baseProps({ sims: mixed, assignments: mixedAssignments })
    });
    const p1 = container.querySelector(
      '[data-testid="period-section"][data-period-id="p1"]'
    )!;
    const toggle = p1.querySelector(
      '[data-testid="period-toggle-done"]'
    ) as HTMLElement;
    expect(toggle.textContent).toMatch(/Done/);
    expect(toggle.textContent).toMatch(/1/);
    expect(
      p1.querySelectorAll(
        '[data-testid="period-done-section"] [data-testid="simulation-card"]'
      ).length
    ).toBe(1);
    await fireEvent.click(toggle);
    expect(p1.querySelector('[data-testid="period-done-section"]')).toBeNull();
  });

  it('fires onAssignToPeriod when a sim id is dropped on a period section', () => {
    const onAssignToPeriod = vi.fn();
    const { container } = render(HpcLane, {
      props: baseProps({ onAssignToPeriod })
    });
    const section = container.querySelector(
      '[data-testid="period-section"][data-period-id="p2"]'
    )!;
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
    section.dispatchEvent(drop);
    expect(onAssignToPeriod).toHaveBeenCalledWith('s1', 'h1', 'p2');
  });
});
