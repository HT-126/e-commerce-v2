import { describe, expect, it } from 'vitest';
import { formatMoney } from './format-money.js';

describe('formatMoney', () => {
  it.each([
    [4499, '$44.99'],
    [695, '$6.95'],
    [9700, '$97.00'],
    [0, '$0.00'],
    [123456, '$1,234.56'],
  ])('%i cents -> %s', (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });
});
