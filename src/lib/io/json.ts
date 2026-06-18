import { migrate } from '$lib/schema';
import type { AppState } from '$lib/types';

/**
 * Serialise an AppState to a pretty-printed JSON string (2-space indent).
 * `schemaVersion` is preserved by virtue of being part of AppState.
 */
export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Parse a JSON string into an AppState. Performs:
 *   1. JSON.parse — wraps parse errors in "Could not parse JSON: ...".
 *   2. migrate() — which itself calls validateState(). Validation failures
 *      are re-thrown wrapped in "Invalid state: ...".
 *
 * The returned AppState is the migrated, validated value (which may differ
 * from the parsed value when a migration was applied).
 */
export function importState(jsonString: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not parse JSON: ${msg}`);
  }

  try {
    return migrate(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If the underlying validation message already starts with "Invalid state",
    // avoid doubling the prefix — pass it through verbatim.
    if (msg.startsWith('Invalid state')) throw new Error(msg);
    throw new Error(`Invalid state: ${msg}`);
  }
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function defaultFilename(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  return `resource-planner-${yyyy}-${mm}-${dd}.json`;
}

/**
 * Trigger a browser file download of the given state as JSON. No-op when
 * running outside the browser (SSR / tests without DOM).
 */
export function downloadStateAsFile(state: AppState, filename?: string): void {
  if (typeof document === 'undefined') return;

  const name = filename ?? defaultFilename();
  const json = exportState(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  // Some browsers require the element to be in the DOM to honour `download`.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
