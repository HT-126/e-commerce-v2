import { describe, expect, it } from 'vitest';
import { computeRating } from '../../src/utils/rating.js';

const rate = (seedAvg, seedCount, reviewSum, reviewCount) =>
  computeRating({ seedAvg, seedCount, reviewSum, reviewCount });

describe('computeRating', () => {
  it('is the dataset rating when there are no real reviews', () => {
    expect(rate(4.7, 7, 0, 0)).toEqual({ ratingAvg: 4.7, reviewCount: 7 });
  });

  it('mixes the dataset rating and the real reviews', () => {
    // (4.0 x 10 + 5) / 11 = 4.09, shown as 4.1
    expect(rate(4.0, 10, 5, 1)).toEqual({ ratingAvg: 4.1, reviewCount: 11 });
    // (4.0 x 10 + 5 + 1) / 12 = 3.83, shown as 3.8
    expect(rate(4.0, 10, 6, 2)).toEqual({ ratingAvg: 3.8, reviewCount: 12 });
  });

  it('is null when there is no dataset rating and no review', () => {
    expect(rate(null, 0, 0, 0)).toEqual({ ratingAvg: null, reviewCount: 0 });
  });

  it('is the average of the real reviews when the dataset has none', () => {
    expect(rate(null, 0, 5, 1)).toEqual({ ratingAvg: 5, reviewCount: 1 });
    // (5 + 4 + 4) / 3 = 4.33, shown as 4.3
    expect(rate(null, 0, 13, 3)).toEqual({ ratingAvg: 4.3, reviewCount: 3 });
  });

  it('rounds half up to one decimal, without floating point errors', () => {
    // (4.0 + 5) / 2 = 4.5 and 4.25 would be 4.3
    expect(rate(4.0, 1, 5, 1).ratingAvg).toBe(4.5);
    expect(rate(null, 0, 17, 4).ratingAvg).toBe(4.3);
    // 1.005-style cases: (1.1 x 3 + 1) / 4 = 1.075, shown as 1.1
    expect(rate(1.1, 3, 1, 1).ratingAvg).toBe(1.1);
    // Always a number with at most one decimal.
    for (const [sum, count] of [[7, 3], [11, 7], [29, 6]]) {
      const { ratingAvg } = rate(3.3, 13, sum, count);
      expect(Math.round(ratingAvg * 10) / 10).toBe(ratingAvg);
    }
  });

  it('reads the decimal string MySQL returns', () => {
    expect(rate('4.7', 7, 0, 0).ratingAvg).toBe(4.7);
  });
});
