import { writable, type Writable } from 'svelte/store';
import { newId } from '$lib/util/id';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  ttlMs: number;
};

export const toasts: Writable<Toast[]> = writable<Toast[]>([]);

/**
 * Push a transient notification onto the toast stack. The toast auto-dismisses
 * after `ttlMs` milliseconds via `setTimeout`. Returns the newly-minted id so
 * callers can dismiss it early if needed.
 */
export function pushToast(input: {
  kind?: ToastKind;
  message: string;
  ttlMs?: number;
}): string {
  const id = newId();
  const toast: Toast = {
    id,
    kind: input.kind ?? 'info',
    message: input.message,
    ttlMs: input.ttlMs ?? 3000
  };
  toasts.update((arr) => [...arr, toast]);
  // setTimeout is available in both browser and Node (and jsdom) so no guard
  // is needed for tests — but we still guard to avoid scheduling in
  // environments where timers aren't desirable.
  if (typeof setTimeout !== 'undefined' && toast.ttlMs > 0) {
    setTimeout(() => dismissToast(id), toast.ttlMs);
  }
  return id;
}

export function dismissToast(id: string): void {
  toasts.update((arr) => arr.filter((t) => t.id !== id));
}

export function clearToasts(): void {
  toasts.set([]);
}
