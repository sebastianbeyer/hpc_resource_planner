import { describe, expect, it } from 'vitest';
import { formatHours, formatStorageTb } from './format';

describe('formatHours', () => {
  it('uses raw H below 1k', () => {
    expect(formatHours(0)).toBe('0 H');
    expect(formatHours(42)).toBe('42 H');
    expect(formatHours(999)).toBe('999 H');
  });

  it('uses kH between 1k and 1M', () => {
    expect(formatHours(1_000)).toBe('1 kH');
    expect(formatHours(4_200)).toBe('4.2 kH');
    expect(formatHours(40_250)).toBe('40.3 kH');
  });

  it('uses MH at or above 1M', () => {
    expect(formatHours(1_000_000)).toBe('1 MH');
    expect(formatHours(4_200_000)).toBe('4.2 MH');
  });
});

describe('formatStorageTb', () => {
  it('uses GB below 1 TB', () => {
    expect(formatStorageTb(0)).toBe('0 GB');
    expect(formatStorageTb(0.4)).toBe('400 GB');
    expect(formatStorageTb(0.04)).toBe('40 GB');
  });

  it('uses TB between 1 and 1000', () => {
    expect(formatStorageTb(1)).toBe('1 TB');
    expect(formatStorageTb(1.5)).toBe('1.5 TB');
    expect(formatStorageTb(450)).toBe('450 TB');
  });

  it('uses PB above 1000 TB', () => {
    expect(formatStorageTb(1_000)).toBe('1 PB');
    expect(formatStorageTb(1_200)).toBe('1.2 PB');
  });
});
