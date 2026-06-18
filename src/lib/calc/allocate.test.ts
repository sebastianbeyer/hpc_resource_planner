import { describe, expect, it } from 'vitest';
import { allocateAcrossPeriods, autoSpread, normaliseSplit } from './allocate';

describe('allocateAcrossPeriods', () => {
  it('puts everything on a single-period sim (1.0 on one period)', () => {
    const r = allocateAcrossPeriods(
      { cpuHours: 1000, gpuHours: 50 },
      { p1: 1 }
    );
    expect(r).toEqual({ p1: { cpuHours: 1000, gpuHours: 50 } });
  });

  it('splits 50/50 across two periods', () => {
    const r = allocateAcrossPeriods(
      { cpuHours: 1000, gpuHours: 50 },
      { p1: 0.5, p2: 0.5 }
    );
    expect(r.p1).toEqual({ cpuHours: 500, gpuHours: 25 });
    expect(r.p2).toEqual({ cpuHours: 500, gpuHours: 25 });
  });

  it('returns empty for an empty split', () => {
    expect(allocateAcrossPeriods({ cpuHours: 100, gpuHours: 5 }, {})).toEqual({});
  });

  it('applies arbitrary fractions without normalising', () => {
    const r = allocateAcrossPeriods(
      { cpuHours: 1000, gpuHours: 100 },
      { p1: 0.25, p2: 0.25 }
    );
    expect(r.p1).toEqual({ cpuHours: 250, gpuHours: 25 });
    expect(r.p2).toEqual({ cpuHours: 250, gpuHours: 25 });
  });
});

describe('normaliseSplit', () => {
  it('reports valid=true when input sums to exactly 1 with values in [0,1]', () => {
    const { valid } = normaliseSplit({ p1: 0.5, p2: 0.5 });
    expect(valid).toBe(true);
  });

  it('reports valid=false when sum is 0.9', () => {
    const { valid, split } = normaliseSplit({ p1: 0.5, p2: 0.4 });
    expect(valid).toBe(false);
    // Renormalised: 0.5/0.9 + 0.4/0.9 = 1
    const sum = Object.values(split).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('clamps negative values to 0 and renormalises', () => {
    const { split, valid } = normaliseSplit({ p1: -0.5, p2: 1 });
    expect(valid).toBe(false);
    expect(split.p1).toBe(0);
    expect(split.p2).toBe(1);
  });

  it('clamps values >1 to 1 and renormalises', () => {
    const { split, valid } = normaliseSplit({ p1: 2, p2: 2 });
    expect(valid).toBe(false);
    expect(split.p1).toBeCloseTo(0.5);
    expect(split.p2).toBeCloseTo(0.5);
  });

  it('returns input as-is when post-clamp sum is 0', () => {
    const input = { p1: -1, p2: -0.5 };
    const { split, valid } = normaliseSplit(input);
    expect(valid).toBe(false);
    // Caller decides what to do; we don't divide by zero.
    expect(split).toEqual(input);
  });

  it('always returns both fields', () => {
    const r = normaliseSplit({});
    expect(r).toHaveProperty('split');
    expect(r).toHaveProperty('valid');
  });

  it('tolerates very small floating point drift', () => {
    // 0.1 + 0.2 + 0.7 in float = 0.9999999... within tolerance.
    const { valid } = normaliseSplit({ p1: 0.1, p2: 0.2, p3: 0.7 });
    expect(valid).toBe(true);
  });
});

describe('autoSpread', () => {
  it('spreads evenly across n periods', () => {
    expect(autoSpread(['a', 'b', 'c', 'd'], 4)).toEqual({
      a: 0.25,
      b: 0.25,
      c: 0.25,
      d: 0.25
    });
  });

  it('takes only the first n periodIds', () => {
    expect(autoSpread(['a', 'b', 'c', 'd'], 2)).toEqual({ a: 0.5, b: 0.5 });
  });

  it('uses all periods when n > length', () => {
    expect(autoSpread(['a', 'b'], 5)).toEqual({ a: 0.5, b: 0.5 });
  });

  it('returns {} for n=0', () => {
    expect(autoSpread(['a', 'b'], 0)).toEqual({});
  });

  it('returns {} for n<0', () => {
    expect(autoSpread(['a', 'b'], -1)).toEqual({});
  });

  it('returns {} for empty periodIds', () => {
    expect(autoSpread([], 3)).toEqual({});
  });
});
