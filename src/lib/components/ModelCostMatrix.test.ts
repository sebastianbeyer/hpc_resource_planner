import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ModelCostMatrix from './ModelCostMatrix.svelte';
import type { Hpc, Model } from '$lib/types';

function sampleModel(): Model {
  return {
    id: 'm1',
    name: 'IFS',
    costs: {}
  };
}

function sampleHpcs(): Hpc[] {
  return [
    {
      id: 'h1',
      name: 'Levante',
      storageBudgetTb: 500,
      periods: []
    }
  ];
}

describe('ModelCostMatrix', () => {
  it('updates cpuHoursPerSimMonth for a (resolution, hpc) cell', async () => {
    const model = sampleModel();
    const onChange = vi.fn();
    const { getAllByTestId } = render(ModelCostMatrix, {
      props: {
        model,
        hpcs: sampleHpcs(),
        resolutions: ['tco79'],
        dataPortfolios: ['standard'],
        onChange
      }
    });

    const cpuInputs = getAllByTestId('cell-cpu');
    await fireEvent.input(cpuInputs[0], { target: { value: '12345' } });

    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as Model;
    expect(next.costs['tco79']).toBeDefined();
    expect(next.costs['tco79']['h1']).toBeDefined();
    expect(next.costs['tco79']['h1'].cpuHoursPerSimMonth).toBe(12345);
    expect(next.costs['tco79']['h1'].gpuHoursPerSimMonth).toBe(0);
  });

  it('updates per-portfolio storage in the right path', async () => {
    const model = sampleModel();
    const onChange = vi.fn();
    const { getAllByTestId } = render(ModelCostMatrix, {
      props: {
        model,
        hpcs: sampleHpcs(),
        resolutions: ['tco79'],
        dataPortfolios: ['standard'],
        onChange
      }
    });

    const storageInputs = getAllByTestId('cell-storage');
    await fireEvent.input(storageInputs[0], { target: { value: '2.5' } });

    const next = onChange.mock.calls[0][0] as Model;
    expect(
      next.costs['tco79']['h1'].storageTbPerSimMonthByPortfolio['standard']
    ).toBe(2.5);
  });

  it('renders an empty-state hint when there are no HPCs', () => {
    const { getByTestId } = render(ModelCostMatrix, {
      props: {
        model: sampleModel(),
        hpcs: [],
        resolutions: ['tco79'],
        dataPortfolios: ['standard'],
        onChange: vi.fn()
      }
    });
    expect(getByTestId('cost-matrix-empty')).toBeTruthy();
  });
});
