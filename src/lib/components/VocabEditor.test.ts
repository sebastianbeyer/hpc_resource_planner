import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import VocabEditor from './VocabEditor.svelte';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('VocabEditor', () => {
  it('adds a new item via the Add button', async () => {
    const onChange = vi.fn();
    const { getByTestId } = render(VocabEditor, {
      props: {
        label: 'Resolutions',
        items: ['tco79'],
        onChange
      }
    });

    await fireEvent.input(getByTestId('vocab-input'), {
      target: { value: 'tco399' }
    });
    await fireEvent.click(getByTestId('vocab-add'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(['tco79', 'tco399']);
  });

  it('silently ignores empty/whitespace-only adds', async () => {
    const onChange = vi.fn();
    const { getByTestId } = render(VocabEditor, {
      props: {
        label: 'Resolutions',
        items: [],
        onChange
      }
    });

    await fireEvent.input(getByTestId('vocab-input'), {
      target: { value: '   ' }
    });
    await fireEvent.click(getByTestId('vocab-add'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('silently ignores duplicate adds', async () => {
    const onChange = vi.fn();
    const { getByTestId } = render(VocabEditor, {
      props: {
        label: 'Resolutions',
        items: ['tco79'],
        onChange
      }
    });

    await fireEvent.input(getByTestId('vocab-input'), {
      target: { value: 'tco79' }
    });
    await fireEvent.click(getByTestId('vocab-add'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes an item when × is clicked and it is not referenced', async () => {
    const onChange = vi.fn();
    const { getAllByTestId } = render(VocabEditor, {
      props: {
        label: 'Resolutions',
        items: ['tco79', 'tco399'],
        onChange,
        isReferenced: () => false
      }
    });

    await fireEvent.click(getAllByTestId('vocab-remove')[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual(['tco399']);
  });

  it('confirms before removing a referenced item; cancels keep it', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onChange = vi.fn();
    const { getAllByTestId } = render(VocabEditor, {
      props: {
        label: 'Resolutions',
        items: ['tco79'],
        onChange,
        isReferenced: () => true
      }
    });

    await fireEvent.click(getAllByTestId('vocab-remove')[0]);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('confirms and removes a referenced item when confirm returns true', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onChange = vi.fn();
    const { getAllByTestId } = render(VocabEditor, {
      props: {
        label: 'Resolutions',
        items: ['tco79'],
        onChange,
        isReferenced: () => true
      }
    });

    await fireEvent.click(getAllByTestId('vocab-remove')[0]);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([]);
  });
});
