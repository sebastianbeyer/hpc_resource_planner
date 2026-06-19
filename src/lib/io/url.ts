import { migrate } from '$lib/schema';
import type { AppState } from '$lib/types';

/** Query-parameter name used to carry a shared config in the URL. */
export const CONFIG_QUERY_PARAM = 'config';

/**
 * Recommended soft cap. Browsers, proxies, and chat clients vary, but
 * 8 kB tends to survive the trip; longer URLs may get truncated when shared.
 */
export const URL_LENGTH_SOFT_CAP = 8000;

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const bin = atob(padded + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function runStream(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // Catch the writer's rejection so it never escapes as an unhandled
  // rejection — we surface the failure via the reader side below, which
  // throws a cleaner error from inside the awaited reader.read() call.
  const writeDone = (async () => {
    await writer.write(bytes as BufferSource);
    await writer.close();
  })().catch(() => {});

  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await writeDone;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  return runStream(bytes, new CompressionStream('deflate-raw'));
}

function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  return runStream(bytes, new DecompressionStream('deflate-raw'));
}

/**
 * Encode an AppState as a base64url string suitable for use as a URL query value.
 * JSON is deflate-compressed before base64-encoding; JSON's repetitive keys
 * (`cpuHoursPerSimMonth`, `storageTbPerSimMonthByResolution`, …) shrink by
 * 70–85% in practice, which makes shared URLs feasible at non-trivial scale.
 * Returns the raw token — callers wrap it with `?config=` themselves.
 */
export async function encodeStateToParam(state: AppState): Promise<string> {
  const json = JSON.stringify(state);
  const compressed = await deflateRaw(new TextEncoder().encode(json));
  return bytesToBase64Url(compressed);
}

/**
 * Decode a base64url token back into a migrated, validated AppState.
 * Throws on malformed base64, invalid JSON, or shape mismatches —
 * messages are prefixed so callers can surface them as toasts.
 */
export async function decodeStateFromParam(param: string): Promise<AppState> {
  let compressed: Uint8Array;
  try {
    compressed = base64UrlToBytes(param);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not decode shared config: ${msg}`);
  }

  let json: string;
  try {
    const decompressed = await inflateRaw(compressed);
    json = new TextDecoder().decode(decompressed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not decode shared config: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not parse shared config: ${msg}`);
  }

  try {
    return migrate(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith('Invalid state')) throw new Error(msg);
    throw new Error(`Invalid state: ${msg}`);
  }
}

/**
 * Build a full shareable URL by appending `?config=<token>` to `baseUrl`.
 * Replaces any existing `config` query parameter and preserves the rest.
 */
export async function buildShareUrl(state: AppState, baseUrl: string): Promise<string> {
  const token = await encodeStateToParam(state);
  const url = new URL(baseUrl);
  url.searchParams.set(CONFIG_QUERY_PARAM, token);
  return url.toString();
}

/**
 * Read the `config` query parameter from a query string. Returns `null` when
 * absent or empty.
 */
export function readConfigParam(search: string): string | null {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const v = params.get(CONFIG_QUERY_PARAM);
  return v && v.length > 0 ? v : null;
}

/**
 * Return a URL string with the `config` parameter removed. Useful after the
 * user has either accepted or dismissed a shared config, so reloading the
 * tab doesn't re-trigger the prompt.
 */
export function stripConfigParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(CONFIG_QUERY_PARAM);
  // Keep a trailing "?" out of the result when no params remain.
  const search = url.searchParams.toString();
  url.search = search ? `?${search}` : '';
  return url.toString();
}
