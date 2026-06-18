import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import HpcEditor from './HpcEditor.svelte';
import type { Hpc } from '$lib/types';

function sampleHpc(): Hpc {
  return {
    id: 'h1',
    name: 'Levante',
    storageBudgetTb: 500,
    periods: []
  };
}

describe('HpcEditor', () => {
  it('renders the current HPC name in the name input', () => {
    const hpc = sampleHpc();
    const { getByTestId } = render(HpcEditor, {
      props: { hpc, onChange: vi.fn(), onDelete: vi.fn() }
    });
    expect((getByTestId('hpc-name') as HTMLInputElement).value).toBe('Levante');
  });

  it('fires onChange with the updated name when typed', async () => {
    const hpc = sampleHpc();
    const onChange = vi.fn();
    const { getByTestId } = render(HpcEditor, {
      props: { hpc, onChange, onDelete: vi.fn() }
    });

    await fireEvent.input(getByTestId('hpc-name'), {
      target: { value: 'Lumi' }
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Hpc;
    expect(next.name).toBe('Lumi');
    expect(next.id).toBe('h1');
    expect(next.storageBudgetTb).toBe(500);
  });

  it('coerces storage budget input to a number', async () => {
    const hpc = sampleHpc();
    const onChange = vi.fn();
    const { getByTestId } = render(HpcEditor, {
      props: { hpc, onChange, onDelete: vi.fn() }
    });

    await fireEvent.input(getByTestId('hpc-storage'), {
      target: { value: '1000' }
    });

    const next = onChange.mock.calls[0][0] as Hpc;
    expect(typeof next.storageBudgetTb).toBe('number');
    expect(next.storageBudgetTb).toBe(1000);
  });

  it('adds a new period when "Add Period" is clicked', async () => {
    const hpc = sampleHpc();
    const onChange = vi.fn();
    const { getByTestId } = render(HpcEditor, {
      props: { hpc, onChange, onDelete: vi.fn() }
    });

    await fireEvent.click(getByTestId('add-period'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Hpc;
    expect(next.periods.length).toBe(1);
    expect(next.periods[0].label).toBe('New Period');
    expect(next.periods[0].cpuHoursBudget).toBe(0);
    expect(next.periods[0].gpuHoursBudget).toBe(0);
    expect(typeof next.periods[0].id).toBe('string');
  });
});
