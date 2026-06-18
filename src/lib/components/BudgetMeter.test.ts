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

  it('renders the label when provided', () => {
    const { container } = render(BudgetMeter, {
      props: { used: 1, budget: 10, unit: 'GPU h', label: '2026 CPU' }
    });
    expect(container.textContent).toMatch(/2026 CPU/);
  });
});
