import { describe, expect, it } from 'vitest';
import { newId } from './id';

describe('newId', () => {
  it('returns a string', () => {
    const id = newId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns a different value on every call', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(newId());
    }
    expect(ids.size).toBe(50);
  });
});
