import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import Toast from './Toast.svelte';
import { clearToasts, pushToast, toasts } from '$lib/stores/toast';

describe('Toast', () => {
  beforeEach(() => {
    clearToasts();
    // Stop auto-dismiss timers from interfering with assertions.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearToasts();
  });

  it('renders nothing when the toasts store is empty', () => {
    const { queryByTestId } = render(Toast);
    expect(queryByTestId('toast-stack')).toBeNull();
  });

  it('renders one pill per toast', async () => {
    const { findAllByTestId, queryByTestId } = render(Toast);
    pushToast({ kind: 'success', message: 'one' });
    pushToast({ kind: 'error', message: 'two' });
    const pills = await findAllByTestId('toast');
    expect(pills).toHaveLength(2);
    expect(queryByTestId('toast-stack')).not.toBeNull();
    expect(pills[0].getAttribute('data-kind')).toBe('success');
    expect(pills[1].getAttribute('data-kind')).toBe('error');
  });

  it('dismisses a toast when × is clicked', async () => {
    const { findAllByTestId } = render(Toast);
    pushToast({ message: 'one' });
    pushToast({ message: 'two' });
    let pills = await findAllByTestId('toast');
    expect(pills).toHaveLength(2);
    const closes = await findAllByTestId('toast-dismiss');
    await fireEvent.click(closes[0]);
    pills = await findAllByTestId('toast');
    expect(pills).toHaveLength(1);
    expect(get(toasts).map((t) => t.message)).toEqual(['two']);
  });
});
