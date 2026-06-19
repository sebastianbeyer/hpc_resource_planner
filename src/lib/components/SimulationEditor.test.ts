import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SimulationEditor from './SimulationEditor.svelte';
import type { Hpc, Model, Simulation } from '$lib/types';

function sampleSim(overrides: Partial<Simulation> = {}): Simulation {
  return {
    id: 's1',
    name: 'test',
    modelId: '',
    resolution: '',
    lengthYears: 1,
    ensembles: 1,
    dataPortfolio: '',
    overheadMultiplier: 1.15,
    locked: false,
    completed: false,
    ...overrides
  };
}

function sampleHpcs(): Hpc[] {
  return [{ id: 'h1', name: 'Levante', storageBudgetTb: 500, periods: [] }];
}

function sampleModel(): Model {
  return {
    id: 'm1',
    name: 'IFS',
    costs: {
      tco79: {
        h1: {
          cpuHoursPerSimMonth: 100,
          gpuHoursPerSimMonth: 10
        }
      }
    },
    storageTbPerSimMonthByResolution: {
      tco79: { standard: 0.5 }
    }
  };
}

describe('SimulationEditor', () => {
  it('renders the current name in the name input', () => {
    const { getByTestId } = render(SimulationEditor, {
      props: {
        sim: sampleSim({ name: 'my-run' }),
        models: [],
        hpcs: [],
        dataPortfolios: [],
        resolutions: [],
        onChange: vi.fn(),
        onDelete: vi.fn()
      }
    });
    expect((getByTestId('sim-name') as HTMLInputElement).value).toBe('my-run');
  });

  it('shows a "no models" hint and disables the model select when models is empty', () => {
    const { getByTestId, getByText } = render(SimulationEditor, {
      props: {
        sim: sampleSim(),
        models: [],
        hpcs: [],
        dataPortfolios: [],
        resolutions: [],
        onChange: vi.fn(),
        onDelete: vi.fn()
      }
    });
    const select = getByTestId('sim-model') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(getByText(/no models — define one in Models tab/i)).toBeTruthy();
  });

  it('toggling locked reveals the pinnedHpcId select and pre-fills with first HPC', async () => {
    const onChange = vi.fn();
    const { getByTestId, queryByTestId } = render(SimulationEditor, {
      props: {
        sim: sampleSim(),
        models: [sampleModel()],
        hpcs: sampleHpcs(),
        dataPortfolios: ['standard'],
        resolutions: ['tco79'],
        onChange,
        onDelete: vi.fn()
      }
    });

    // Initially no pinned select.
    expect(queryByTestId('sim-pinned')).toBeNull();

    // Toggle locked on.
    await fireEvent.click(getByTestId('sim-locked'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Simulation;
    expect(next.locked).toBe(true);
    expect(next.pinnedHpcId).toBe('h1');
  });

  it('shows the locked-without-pin warning when locked and no pinnedHpcId is set', () => {
    const { getByTestId } = render(SimulationEditor, {
      props: {
        sim: sampleSim({ locked: true }),
        models: [sampleModel()],
        hpcs: sampleHpcs(),
        dataPortfolios: ['standard'],
        resolutions: ['tco79'],
        onChange: vi.fn(),
        onDelete: vi.fn()
      }
    });
    expect(getByTestId('warn-locked-no-pin')).toBeTruthy();
  });

  it('toggles the completed flag', async () => {
    const onChange = vi.fn();
    const { getByTestId } = render(SimulationEditor, {
      props: {
        sim: sampleSim(),
        models: [sampleModel()],
        hpcs: sampleHpcs(),
        dataPortfolios: ['standard'],
        resolutions: ['tco79'],
        onChange,
        onDelete: vi.fn()
      }
    });

    await fireEvent.click(getByTestId('sim-completed'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as Simulation).completed).toBe(true);
  });

  it('shows the missing-cost warning when (modelId, resolution) has no matching cell on at least one HPC', () => {
    // Model has cost for tco79, but the sim picks tco399 which has none.
    const { getByTestId } = render(SimulationEditor, {
      props: {
        sim: sampleSim({ modelId: 'm1', resolution: 'tco399' }),
        models: [sampleModel()],
        hpcs: sampleHpcs(),
        dataPortfolios: ['standard'],
        resolutions: ['tco79', 'tco399'],
        onChange: vi.fn(),
        onDelete: vi.fn()
      }
    });
    const warn = getByTestId('warn-missing-cost');
    expect(warn).toBeTruthy();
    expect(warn.textContent).toMatch(/tco399/);
    expect(warn.textContent).toMatch(/Levante/);
  });

  it('does not show the missing-cost warning when cost is defined', () => {
    const { queryByTestId } = render(SimulationEditor, {
      props: {
        sim: sampleSim({ modelId: 'm1', resolution: 'tco79' }),
        models: [sampleModel()],
        hpcs: sampleHpcs(),
        dataPortfolios: ['standard'],
        resolutions: ['tco79'],
        onChange: vi.fn(),
        onDelete: vi.fn()
      }
    });
    expect(queryByTestId('warn-missing-cost')).toBeNull();
  });

  it('keeps package-label edits local until blur', async () => {
    const onChange = vi.fn();
    const { getByTestId } = render(SimulationEditor, {
      props: {
        sim: sampleSim({ packageLabel: 'phase-a' }),
        models: [sampleModel()],
        hpcs: sampleHpcs(),
        dataPortfolios: ['standard'],
        resolutions: ['tco79'],
        onChange,
        onDelete: vi.fn()
      }
    });

    const input = getByTestId('sim-package') as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: 'phase-ab' } });

    expect(input.value).toBe('phase-ab');
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0][0] as Simulation).packageLabel).toBe('phase-ab');
  });
});
