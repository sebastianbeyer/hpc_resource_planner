import { describe, expect, it } from 'vitest';
import {
  CONFIG_QUERY_PARAM,
  buildShareUrl,
  decodeStateFromParam,
  encodeStateToParam,
  readConfigParam,
  stripConfigParam
} from './url';
import { defaultState } from '$lib/schema';
import type { AppState } from '$lib/types';

function makeFullState(): AppState {
  return {
    schemaVersion: 3,
    hpcs: [
      {
        id: 'hpc-1',
        name: 'Levante — Ümlauts ✓',
        storageBudgetTb: 500,
        periods: [{ id: 'p-1', label: '2026', cpuHoursBudget: 1000, gpuHoursBudget: 100 }]
      }
    ],
    models: [
      {
        id: 'model-1',
        name: 'IFS',
        costs: {
          tco399: { 'hpc-1': { cpuHoursPerSimMonth: 100, gpuHoursPerSimMonth: 0 } }
        },
        storageTbPerSimMonthByResolution: { tco399: { standard: 0.5 } }
      }
    ],
    simulations: [
      {
        id: 'sim-1',
        name: 'historical',
        modelId: 'model-1',
        resolution: 'tco399',
        lengthYears: 10,
        ensembles: 1,
        dataPortfolio: 'standard',
        overheadMultiplier: 1.15,
        locked: false,
        completed: false
      }
    ],
    assignments: [{ simulationId: 'sim-1', hpcId: 'hpc-1', periodSplit: { 'p-1': 1 } }],
    dataPortfolios: ['minimal', 'standard', 'extended'],
    resolutions: ['tco79', 'tco399', 'tco1279', 'tco2559']
  };
}

// Build a state with many simulations so compression has plenty of redundancy
// to chew on — used by the size-reduction assertion.
function makeLargeState(): AppState {
  const base = makeFullState();
  const sims = Array.from({ length: 50 }, (_, i) => ({
    ...base.simulations[0],
    id: `sim-${i}`,
    name: `historical-run-${i}`
  }));
  const assignments = sims.map((s) => ({
    simulationId: s.id,
    hpcId: 'hpc-1',
    periodSplit: { 'p-1': 1 }
  }));
  return { ...base, simulations: sims, assignments };
}

describe('encode/decode round-trip', () => {
  it('round-trips defaultState exactly', async () => {
    const s = defaultState();
    expect(await decodeStateFromParam(await encodeStateToParam(s))).toEqual(s);
  });

  it('round-trips a non-trivial state with unicode characters', async () => {
    const s = makeFullState();
    expect(await decodeStateFromParam(await encodeStateToParam(s))).toEqual(s);
  });

  it('produces URL-safe characters only (no +, /, or =)', async () => {
    const token = await encodeStateToParam(makeFullState());
    expect(token).not.toMatch(/[+/=]/);
  });
});

describe('compression reduces URL length', () => {
  it('compressed token is substantially smaller than raw JSON for a populated state', async () => {
    const s = makeLargeState();
    const rawJsonLen = JSON.stringify(s).length;
    const tokenLen = (await encodeStateToParam(s)).length;
    // base64 alone would inflate by ~33%; we expect compression to more than
    // offset that and then some. 50% is a conservative bar that catches
    // accidental disabling of the compression step.
    expect(tokenLen).toBeLessThan(rawJsonLen * 0.5);
  });
});

describe('decodeStateFromParam error handling', () => {
  it('throws on non-base64 input', async () => {
    await expect(decodeStateFromParam('!!!not base64!!!')).rejects.toThrow(
      /Could not (decode|parse) shared config/
    );
  });

  it('throws on base64 that is not a valid deflate stream', async () => {
    // Encode arbitrary bytes that won't form a valid deflate-raw stream.
    const bogus = btoa('this is plain text, not compressed')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    await expect(decodeStateFromParam(bogus)).rejects.toThrow(
      /Could not decode shared config/
    );
  });

  it('throws "Invalid state" when payload decodes to wrong-shape JSON', async () => {
    // Encode a well-formed-JSON-but-wrong-shape payload through the same
    // pipeline the producer would use, so we exercise the validation path.
    const token = await encodeStateToParam({ not: 'a state' } as unknown as AppState);
    await expect(decodeStateFromParam(token)).rejects.toThrow(/Invalid state/);
  });

  it('migrates an older schemaVersion payload', async () => {
    const v1 = {
      schemaVersion: 1,
      hpcs: [],
      models: [],
      simulations: [],
      assignments: [],
      dataPortfolios: [],
      resolutions: []
    };
    const token = await encodeStateToParam(v1 as unknown as AppState);
    const out = await decodeStateFromParam(token);
    expect(out.schemaVersion).toBe(3);
  });
});

describe('buildShareUrl', () => {
  it('appends the config param to the base URL', async () => {
    const url = await buildShareUrl(defaultState(), 'https://example.org/plan');
    const parsed = new URL(url);
    expect(parsed.searchParams.get(CONFIG_QUERY_PARAM)).toBeTruthy();
    expect(parsed.pathname).toBe('/plan');
  });

  it('replaces an existing config param rather than duplicating it', async () => {
    const url = await buildShareUrl(defaultState(), 'https://example.org/?config=stale');
    const parsed = new URL(url);
    expect(parsed.searchParams.getAll(CONFIG_QUERY_PARAM)).toHaveLength(1);
    expect(parsed.searchParams.get(CONFIG_QUERY_PARAM)).not.toBe('stale');
  });

  it('preserves other query params', async () => {
    const url = await buildShareUrl(defaultState(), 'https://example.org/?foo=bar');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('foo')).toBe('bar');
  });
});

describe('readConfigParam', () => {
  it('returns the token when present', () => {
    expect(readConfigParam('?config=abc')).toBe('abc');
    expect(readConfigParam('config=abc')).toBe('abc');
  });

  it('returns null when absent or empty', () => {
    expect(readConfigParam('')).toBeNull();
    expect(readConfigParam('?foo=bar')).toBeNull();
    expect(readConfigParam('?config=')).toBeNull();
  });
});

describe('stripConfigParam', () => {
  it('removes only the config param', () => {
    const stripped = stripConfigParam('https://example.org/plan?foo=bar&config=xyz');
    expect(stripped).toBe('https://example.org/plan?foo=bar');
  });

  it('leaves URLs without a config param untouched', () => {
    const stripped = stripConfigParam('https://example.org/plan?foo=bar');
    expect(stripped).toBe('https://example.org/plan?foo=bar');
  });

  it('drops the question mark when no params remain', () => {
    const stripped = stripConfigParam('https://example.org/plan?config=xyz');
    expect(stripped).toBe('https://example.org/plan');
  });
});
