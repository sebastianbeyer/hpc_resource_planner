import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
  it('renders title and message', () => {
    const { getByTestId } = render(EmptyState, {
      props: { title: 'Nothing here', message: 'Add something to get going.' }
    });
    expect(getByTestId('empty-state-title').textContent).toBe('Nothing here');
    expect(getByTestId('empty-state-message').textContent).toBe(
      'Add something to get going.'
    );
  });

  it('does not render the action button when actionLabel is omitted', () => {
    const { queryByTestId } = render(EmptyState, {
      props: { title: 't', message: 'm' }
    });
    expect(queryByTestId('empty-state-action')).toBeNull();
  });

  it('invokes onAction when the button is clicked', async () => {
    const onAction = vi.fn();
    const { getByTestId } = render(EmptyState, {
      props: { title: 't', message: 'm', actionLabel: 'Do it', onAction }
    });
    const btn = getByTestId('empty-state-action');
    expect(btn.textContent).toBe('Do it');
    await fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
