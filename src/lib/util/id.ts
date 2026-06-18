/**
 * Generate a fresh opaque identifier. Uses `crypto.randomUUID()` which is
 * available in modern browsers and Node >=16. We keep this in a single helper
 * so tests can monkey-patch it if needed and so the call-site intent ("I need
 * a new ID for an entity") is explicit.
 */
export function newId(): string {
  return crypto.randomUUID();
}
