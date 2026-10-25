import { describe, expect, it } from 'vitest';
import { addQuantity, countUnits } from './cart.js';

describe('addQuantity', () => {
  it('adds the quantities', () => {
    expect(addQuantity(2, 3)).toBe(5);
  });

  it('never goes above 9', () => {
    expect(addQuantity(8, 5)).toBe(9);
    expect(addQuantity(9, 1)).toBe(9);
  });
});

describe('countUnits', () => {
  it('sums the quantities of all lines', () => {
    expect(countUnits([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  });

  it('is 0 for no lines', () => {
    expect(countUnits([])).toBe(0);
  });
});
