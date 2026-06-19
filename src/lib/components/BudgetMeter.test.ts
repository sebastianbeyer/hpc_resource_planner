import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import BudgetMeter from './BudgetMeter.svelte';

describe('BudgetMeter', () => {
  it('renders a green/neutral bar when used < budget', () => {
    const { getByTestId } = render(BudgetMeter, {
      props: { used: 100, budget: 1000, unit: 'CPU h' }
    });
    const meter = getByTestId('budget-meter');
    expect(meter.getAttribute('data-over-budget')).toBe('false');
    const bar = getByTestId('meter-bar');
    // The inner fill div should carry the green class, not the red one.
    expect(bar.innerHTML).toMatch(/bg-emerald/);
    expect(bar.innerHTML).not.toMatch(/bg-red/);
  });

  it('renders red bar and OVER BUDGET tag when used > budget', () => {
    const { getByTestId } = render(BudgetMeter, {
      props: { used: 1500, budget: 1000, unit: 'CPU h' }
    });
    const meter = getByTestId('budget-meter');
    expect(meter.getAttribute('data-over-budget')).toBe('true');
    const bar = getByTestId('meter-bar');
    expect(bar.innerHTML).toMatch(/bg-red/);

    // Over-budget tag visible.
    expect(getByTestId('over-budget-tag')).toBeTruthy();

    // Numeric is red.
    const numeric = getByTestId('meter-numeric');
    expect(numeric.className).toMatch(/text-red/);
  });

  it('renders an N/A bar when budget is 0', () => {
    const { getByTestId } = render(BudgetMeter, {
      props: { used: 0, budget: 0, unit: 'CPU h' }
    });
    const meter = getByTestId('budget-meter');
    expect(meter.getAttribute('data-has-budget')).toBe('false');
    const numeric = getByTestId('meter-numeric');
    expect(numeric.textContent?.toLowerCase()).toMatch(/no budget set/);
  });

  it('shows the unit in the numeric line', () => {
    const { getByTestId } = render(BudgetMeter, {
      props: { used: 200, budget: 1000, unit: 'TB' }
    });
    const numeric = getByTestId('meter-numeric');
    expect(numeric.textContent).toMatch(/TB/);
  });

  it('renders completed usage as a grey segment before active usage', () => {
    const { getByTestId } = render(BudgetMeter, {
      props: { used: 300, completed: 100, budget: 1000, unit: 'CPU h' }
    });

    const completed = getByTestId('meter-completed-segment');
    const active = getByTestId('meter-active-segment');
    expect(completed.className).toMatch(/bg-slate-400/);
    expect(completed.getAttribute('style')).toContain('width: 10%');
    expect(active.className).toMatch(/bg-emerald-500/);
    expect(active.getAttribute('style')).toContain('width: 20%');
    expect(getByTestId('completed-used').textContent).toContain('100 CPU h completed');
  });

  it('renders the label when provided', () => {
    const { container } = render(BudgetMeter, {
      props: { used: 1, budget: 10, unit: 'GPU h', label: '2026 CPU' }
    });
    expect(container.textContent).toMatch(/2026 CPU/);
  });

  it('renders one segment per sim with a tooltip when segments are provided', () => {
    const { getAllByTestId, queryByTestId } = render(BudgetMeter, {
      props: {
        used: 800,
        budget: 1000,
        unit: 'CPU h',
        segments: [
          {
            simulationId: 's1',
            simulationName: 'Sim One',
            modelId: 'm1',
            modelName: 'IFS',
            value: 500,
            completed: false
          },
          {
            simulationId: 's2',
            simulationName: 'Sim Two',
            modelId: 'm1',
            modelName: 'IFS',
            value: 300,
            completed: true
          }
        ]
      }
    });

    const segs = getAllByTestId('meter-segment');
    expect(segs.length).toBe(2);

    expect(segs[0].getAttribute('title')).toMatch(/Sim One/);
    expect(segs[0].getAttribute('title')).toMatch(/500 CPU h/);
    expect(segs[0].getAttribute('title')).toMatch(/IFS/);
    expect(segs[0].getAttribute('data-sim-id')).toBe('s1');
    expect(segs[0].getAttribute('data-completed')).toBe('false');
    expect(segs[0].getAttribute('style')).toContain('width: 50%');

    expect(segs[1].getAttribute('title')).toMatch(/Sim Two/);
    expect(segs[1].getAttribute('title')).toMatch(/completed/);
    expect(segs[1].getAttribute('data-completed')).toBe('true');
    expect(segs[1].getAttribute('style')).toContain('width: 30%');

    // Sims sharing a model share a color base — the completed one uses the
    // darker variant to show it's "filled in / done".
    expect(segs[0].className).toMatch(/bg-\w+-500/);
    expect(segs[1].className).toMatch(/bg-\w+-700/);

    // Old two-segment markers should not be present when segments take over.
    expect(queryByTestId('meter-completed-segment')).toBeNull();
    expect(queryByTestId('meter-active-segment')).toBeNull();
  });

  it('wraps the bar in a red ring when segmented and over budget', () => {
    const { getByTestId } = render(BudgetMeter, {
      props: {
        used: 1500,
        budget: 1000,
        unit: 'CPU h',
        segments: [
          {
            simulationId: 's1',
            simulationName: 'Big',
            modelId: 'm1',
            modelName: 'IFS',
            value: 1500,
            completed: false
          }
        ]
      }
    });
    const bar = getByTestId('meter-bar');
    expect(bar.className).toMatch(/ring-red/);
    expect(getByTestId('over-budget-tag')).toBeTruthy();
  });
});
