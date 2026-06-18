import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PeriodEditor from './PeriodEditor.svelte';
import type { Period } from '$lib/types';

function samplePeriod(): Period {
  return {
    id: 'p1',
    label: '2026',
    cpuHoursBudget: 1000,
    gpuHoursBudget: 50
  };
}

describe('PeriodEditor', () => {
  it('renders the current period values', () => {
    const period = samplePeriod();
    const { getByTestId } = render(PeriodEditor, {
      props: { period, onChange: vi.fn() }
    });
    expect((getByTestId('period-label') as HTMLInputElement).value).toBe('2026');
    expect((getByTestId('period-cpu') as HTMLInputElement).value).toBe('1000');
    expect((getByTestId('period-gpu') as HTMLInputElement).value).toBe('50');
  });

  it('fires onChange with the updated label', async () => {
    const period = samplePeriod();
    const onChange = vi.fn();
    const { getByTestId } = render(PeriodEditor, {
      props: { period, onChange }
    });

    await fireEvent.input(getByTestId('period-label'), {
      target: { value: '2027' }
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Period;
    expect(next.label).toBe('2027');
    expect(next.id).toBe('p1');
    expect(next.cpuHoursBudget).toBe(1000);
  });

  it('coerces numeric inputs to actual numbers', async () => {
    const period = samplePeriod();
    const onChange = vi.fn();
    const { getByTestId } = render(PeriodEditor, {
      props: { period, onChange }
    });

    await fireEvent.input(getByTestId('period-cpu'), {
      target: { value: '2500' }
    });

    const next = onChange.mock.calls[0][0] as Period;
    expect(typeof next.cpuHoursBudget).toBe('number');
    expect(next.cpuHoursBudget).toBe(2500);
  });
});
