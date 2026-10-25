import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api.js';
import { describePayError } from './pay-errors.js';

describe('describePayError', () => {
  it('names every line that could not be taken when the stock changed', () => {
    const details = [
      { variantId: 1, title: 'Blue Dress', color: 'Blue', size: 'M' },
      { variantId: 2, title: 'Red Top', color: 'Red', size: 'S' },
    ];

    const result = describePayError(new ApiError(409, 'STOCK_CHANGED', 'x', details));

    expect(result.message).toBe('Some items changed while you were paying. Nothing was charged.');
    expect(result.items).toEqual(['Blue Dress, Blue, M', 'Red Top, Red, S']);
  });

  it('handles a stock change without details', () => {
    expect(describePayError(new ApiError(409, 'STOCK_CHANGED', 'x')).items).toEqual([]);
  });

  it('says a line cannot be bought when the bag is not ready', () => {
    const result = describePayError(new ApiError(400, 'CART_NOT_READY', 'x'));

    expect(result.message).toBe('Some items in your bag cannot be bought right now. Nothing was charged.');
  });

  it('says the bag is empty', () => {
    expect(describePayError(new ApiError(400, 'CART_EMPTY', 'x')).message).toBe('Your bag is empty.');
  });

  it('gives a plain message for anything else, and says nothing was charged', () => {
    for (const error of [new ApiError(500, undefined, 'boom'), new TypeError('Failed to fetch')]) {
      expect(describePayError(error).message).toBe(
        'Could not place your order. Nothing was charged. Please try again.',
      );
    }
  });
});
