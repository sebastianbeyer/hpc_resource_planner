import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ModelEditor from './ModelEditor.svelte';
import type { Model } from '$lib/types';

function sampleModel(): Model {
  return {
    id: 'm1',
    name: 'IFS',
    costs: {},
    storageTbPerSimMonthByResolution: {}
  };
}

describe('ModelEditor', () => {
  it('renders the current model name', () => {
    const model = sampleModel();
    const { getByTestId } = render(ModelEditor, {
      props: {
        model,
        hpcs: [],
        resolutions: [],
        dataPortfolios: [],
        onChange: vi.fn(),
        onDelete: vi.fn()
      }
    });
    expect((getByTestId('model-name') as HTMLInputElement).value).toBe('IFS');
  });

  it('fires onChange with the updated name when typed', async () => {
    const model = sampleModel();
    const onChange = vi.fn();
    const { getByTestId } = render(ModelEditor, {
      props: {
        model,
        hpcs: [],
        resolutions: [],
        dataPortfolios: [],
        onChange,
        onDelete: vi.fn()
      }
    });

    await fireEvent.input(getByTestId('model-name'), {
      target: { value: 'ICON' }
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Model;
    expect(next.name).toBe('ICON');
    expect(next.id).toBe('m1');
  });
});
