import { describe, expect, it } from 'vitest';
import { buildCart, collapseItems, lineStatus, mergeQuantity, shippingCents } from '../../src/utils/cart.js';

const line = (status, lineTotalCents) => ({ status, lineTotalCents });

describe('lineStatus', () => {
  it('is ok when the stock covers the quantity', () => {
    expect(lineStatus({ stock: 3, isActive: true, quantity: 3 })).toBe('ok');
    expect(lineStatus({ stock: 10, isActive: true, quantity: 1 })).toBe('ok');
  });

  it('is not_enough when there is some stock, but less than the quantity', () => {
    expect(lineStatus({ stock: 2, isActive: true, quantity: 3 })).toBe('not_enough');
  });

  it('is sold_out when the stock is 0', () => {
    expect(lineStatus({ stock: 0, isActive: true, quantity: 1 })).toBe('sold_out');
  });

  it('is sold_out when the product is hidden, whatever the stock', () => {
    expect(lineStatus({ stock: 10, isActive: false, quantity: 1 })).toBe('sold_out');
  });
});

describe('shippingCents', () => {
  it('charges 695 below $97.00 and nothing from $97.00', () => {
    expect(shippingCents(9699)).toBe(695);
    expect(shippingCents(9700)).toBe(0);
    expect(shippingCents(20000)).toBe(0);
  });
});

describe('buildCart', () => {
  it('counts only ok lines in the totals', () => {
    const cart = buildCart([line('ok', 3000), line('not_enough', 5000), line('sold_out', 7000)]);

    expect(cart.subtotalCents).toBe(3000);
    expect(cart.shippingCents).toBe(695);
    expect(cart.totalCents).toBe(3695);
  });

  it('gives free shipping once the ok lines reach $97.00', () => {
    const cart = buildCart([line('ok', 5000), line('ok', 4700)]);

    expect(cart.shippingCents).toBe(0);
    expect(cart.totalCents).toBe(9700);
  });

  it('allows checkout only when there is a line and every line is ok', () => {
    expect(buildCart([line('ok', 3000), line('ok', 1000)]).canCheckout).toBe(true);
    expect(buildCart([line('ok', 3000), line('not_enough', 1000)]).canCheckout).toBe(false);
    expect(buildCart([line('ok', 3000), line('sold_out', 1000)]).canCheckout).toBe(false);
    expect(buildCart([]).canCheckout).toBe(false);
  });

  it('has no shipping when no line is ok', () => {
    expect(buildCart([]).shippingCents).toBe(0);
    expect(buildCart([line('sold_out', 3000)])).toMatchObject({
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
    });
  });
});

describe('mergeQuantity', () => {
  it('keeps the larger quantity, not the sum', () => {
    expect(mergeQuantity(2, 5)).toBe(5);
    expect(mergeQuantity(5, 2)).toBe(5);
    expect(mergeQuantity(3, 3)).toBe(3);
  });

  it('takes the new quantity when the variant is not in the cart yet', () => {
    expect(mergeQuantity(undefined, 4)).toBe(4);
  });

  it('never goes above 9', () => {
    expect(mergeQuantity(9, 9)).toBe(9);
    expect(mergeQuantity(undefined, 12)).toBe(9);
  });
});

describe('collapseItems', () => {
  it('makes one item per variant with the larger quantity, in first-seen order', () => {
    const items = [
      { variantId: 7, quantity: 2 },
      { variantId: 3, quantity: 1 },
      { variantId: 7, quantity: 5 },
    ];

    expect(collapseItems(items)).toEqual([
      { variantId: 7, quantity: 5 },
      { variantId: 3, quantity: 1 },
    ]);
  });

  it('returns an empty list for an empty list', () => {
    expect(collapseItems([])).toEqual([]);
  });
});
