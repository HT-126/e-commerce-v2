import { describe, expect, it } from 'vitest';
import { buildOrderNumber, sortByVariant } from '../../src/utils/order.js';

describe('buildOrderNumber', () => {
  it('is LM, the UTC date as YYMMDD and 4 digits', () => {
    const number = buildOrderNumber(new Date('2026-10-25T10:00:00Z'), () => 0.4821);

    expect(number).toBe('LM-261025-4821');
  });

  it('pads the digits with zeros', () => {
    expect(buildOrderNumber(new Date('2026-01-02T00:00:00Z'), () => 0)).toBe('LM-260102-0000');
    expect(buildOrderNumber(new Date('2026-01-02T00:00:00Z'), () => 0.0042)).toBe('LM-260102-0042');
  });

  it('uses the UTC date, not the local one', () => {
    // 23:30 UTC on the 31st is already the 1st in a time zone east of UTC.
    expect(buildOrderNumber(new Date('2026-12-31T23:30:00Z'), () => 0.5)).toBe('LM-261231-5000');
  });

  it('always matches the format, whatever the random number', () => {
    for (const random of [0, 0.0001, 0.5, 0.9999]) {
      expect(buildOrderNumber(new Date(), () => random)).toMatch(/^LM-\d{6}-\d{4}$/);
    }
  });
});

describe('sortByVariant', () => {
  it('puts the lowest variant id first, without changing the original list', () => {
    const lines = [{ variantId: 9 }, { variantId: 2 }, { variantId: 5 }];

    expect(sortByVariant(lines).map((line) => line.variantId)).toEqual([2, 5, 9]);
    expect(lines.map((line) => line.variantId)).toEqual([9, 2, 5]);
  });
});
