import { describe, expect, it } from 'vitest';
import { escapeLike, productOrder, variantOptions } from '../../src/utils/catalog.js';
import { getProductSchema, listProductsSchema } from '../../src/schemas/products.schema.js';

describe('escapeLike', () => {
  it.each([
    ['plain', 'plain'],
    ['100%', '100\\%'],
    ['a_b', 'a\\_b'],
    ['back\\slash', 'back\\\\slash'],
  ])('%s -> %s', (input, expected) => {
    expect(escapeLike(input)).toBe(expected);
  });
});

describe('productOrder', () => {
  it.each(['newest', 'rating', 'price_asc', 'price_desc'])('%s ends with the id tie-break', (sort) => {
    const order = productOrder(sort);

    expect(order.at(-1).column).toBe('products.id');
  });

  it('rating sorts by rating, then review count', () => {
    expect(productOrder('rating').slice(0, 2)).toEqual([
      { column: 'products.rating_avg', order: 'desc' },
      { column: 'products.review_count', order: 'desc' },
    ]);
  });
});

describe('variantOptions', () => {
  it('keeps display order and removes duplicates', () => {
    const variants = [
      { color: 'Gray', size: 'S' },
      { color: 'Gray', size: 'M' },
      { color: 'Black', size: 'S' },
      { color: 'Black', size: 'M' },
    ];

    expect(variantOptions(variants)).toEqual({ colors: ['Gray', 'Black'], sizes: ['S', 'M'] });
  });

  it('handles no variants', () => {
    expect(variantOptions([])).toEqual({ colors: [], sizes: [] });
  });
});

describe('listProductsSchema', () => {
  it('fills the defaults', () => {
    expect(listProductsSchema.parse({})).toEqual({ sort: 'newest', page: 1, limit: 12 });
  });

  it('turns query strings into numbers and trims the search', () => {
    const parsed = listProductsSchema.parse({ page: '2', limit: '48', maxPriceCents: '4499', q: '  dress ' });

    expect(parsed).toMatchObject({ page: 2, limit: 48, maxPriceCents: 4499, q: 'dress' });
  });

  it('treats empty strings as not sent', () => {
    expect(listProductsSchema.parse({ q: '', sort: '', limit: '' })).toEqual({
      sort: 'newest',
      page: 1,
      limit: 12,
    });
  });

  it('rejects a page above 10000', () => {
    expect(listProductsSchema.safeParse({ page: '10000' }).success).toBe(true);
    expect(listProductsSchema.safeParse({ page: '10001' }).success).toBe(false);
  });

  it('rejects a limit above 48', () => {
    expect(listProductsSchema.safeParse({ limit: '49' }).success).toBe(false);
  });
});

describe('getProductSchema', () => {
  it('needs a slug', () => {
    expect(getProductSchema.safeParse({}).success).toBe(false);
    expect(getProductSchema.safeParse({ slug: 'a-dress' }).success).toBe(true);
  });
});
