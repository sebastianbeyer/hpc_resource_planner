/**
 * Vitest setup file.
 *
 * Node 26 ships `localStorage` and `sessionStorage` as experimental globals
 * (gated behind `--localstorage-file`), which makes them appear truthy via
 * `('localStorage' in globalThis)`. Vitest's jsdom environment filter sees
 * those keys already present on the global and therefore SKIPS copying
 * jsdom's working Web Storage implementations onto the global — leaving
 * `window.localStorage` permanently undefined.
 *
 * The fix: pull the storage objects directly off the jsdom `window` (where
 * jsdom did install them) and pin them on the global with our own
 * descriptors, overriding Node's stubs. Done once at setup time.
 */
import '@testing-library/jest-dom/vitest';

const jsdomWindow = (globalThis as unknown as { jsdom?: { window: Window } })
  .jsdom?.window;

if (jsdomWindow) {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    const value = jsdomWindow[key];
    if (value) {
      Object.defineProperty(globalThis, key, {
        value,
        configurable: true,
        writable: true
      });
    }
  }
}
