import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PeriodSplitEditor from './PeriodSplitEditor.svelte';
import type { Assignment, Period } from '$lib/types';

const periods: Period[] = [
  { id: 'p1', label: '2026', cpuHoursBudget: 0, gpuHoursBudget: 0 },
  { id: 'p2', label: '2027', cpuHoursBudget: 0, gpuHoursBudget: 0 }
];

function assignment(split: Record<string, number> = { p1: 1 }): Assignment {
  return { simulationId: 's1', hpcId: 'h1', periodSplit: split };
}

describe('PeriodSplitEditor', () => {
  it('renders one input per period', () => {
    const { getAllByTestId } = render(PeriodSplitEditor, {
      props: { assignment: assignment(), periods, onChange: vi.fn() }
    });
    expect(getAllByTestId('split-input').length).toBe(2);
  });

  it('auto-spread N=2 produces 0.5/0.5 and fires onChange', async () => {
    const onChange = vi.fn();
    const { getByTestId } = render(PeriodSplitEditor, {
      props: { assignment: assignment(), periods, onChange }
    });
    await fireEvent.input(getByTestId('spread-n'), { target: { value: '2' } });
    await fireEvent.click(getByTestId('spread-apply'));
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0] as Record<string, number>;
    expect(last.p1).toBeCloseTo(0.5);
    expect(last.p2).toBeCloseTo(0.5);
  });

  it('manual input triggers onChange', async () => {
    const onChange = vi.fn();
    const { getAllByTestId } = render(PeriodSplitEditor, {
      props: { assignment: assignment({ p1: 1, p2: 0 }), periods, onChange }
    });
    const inputs = getAllByTestId('split-input');
    await fireEvent.input(inputs[1], { target: { value: '0.4' } });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0] as Record<string, number>;
    expect(last.p2).toBeCloseTo(0.4);
  });

  it('shows valid indicator when sum is 1.0', () => {
    const { getByTestId } = render(PeriodSplitEditor, {
      props: { assignment: assignment({ p1: 0.5, p2: 0.5 }), periods, onChange: vi.fn() }
    });
    expect(getByTestId('split-validity').textContent).toMatch(/Valid/);
  });

  it('shows warning indicator when sum is not 1.0', () => {
    const { getByTestId } = render(PeriodSplitEditor, {
      props: { assignment: assignment({ p1: 0.3, p2: 0.3 }), periods, onChange: vi.fn() }
    });
    expect(getByTestId('split-validity').textContent).toMatch(/Sum/);
  });
});
