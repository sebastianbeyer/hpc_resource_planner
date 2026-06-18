import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { clearToasts, dismissToast, pushToast, toasts } from './toast';

describe('toast store', () => {
  beforeEach(() => {
    clearToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearToasts();
  });

  it('starts empty', () => {
    expect(get(toasts)).toEqual([]);
  });

  it('pushToast adds an entry with defaults', () => {
    const id = pushToast({ message: 'hello' });
    const list = get(toasts);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(id);
    expect(list[0].message).toBe('hello');
    expect(list[0].kind).toBe('info');
    expect(list[0].ttlMs).toBe(3000);
  });

  it('pushToast honours kind and ttlMs', () => {
    pushToast({ kind: 'error', message: 'boom', ttlMs: 1000 });
    const t = get(toasts)[0];
    expect(t.kind).toBe('error');
    expect(t.ttlMs).toBe(1000);
  });

  it('dismissToast removes the matching toast', () => {
    const a = pushToast({ message: 'a' });
    pushToast({ message: 'b' });
    dismissToast(a);
    const remaining = get(toasts);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].message).toBe('b');
  });

  it('auto-dismisses after ttlMs', () => {
    pushToast({ message: 'gone soon', ttlMs: 2000 });
    expect(get(toasts)).toHaveLength(1);
    vi.advanceTimersByTime(1999);
    expect(get(toasts)).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(get(toasts)).toHaveLength(0);
  });

  it('multiple toasts are independent', () => {
    pushToast({ message: 'first', ttlMs: 1000 });
    pushToast({ message: 'second', ttlMs: 5000 });
    vi.advanceTimersByTime(1000);
    const list = get(toasts);
    expect(list).toHaveLength(1);
    expect(list[0].message).toBe('second');
  });
});
