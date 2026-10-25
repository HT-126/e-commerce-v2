import { describe, expect, it } from 'vitest';
import { escapeLike, productOrder, sortSizes, variantOptions } from '../../src/utils/catalog.js';
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

describe('sortSizes', () => {
  it('puts letter sizes in order, One Size after them, then number sizes in natural order', () => {
    const sizes = ['10', 'One Size', 'XL', '4', 'S', '2XL', 'M', '16W', 'XS', '8', 'L', '3XL', '9(29)'];

    expect(sortSizes(sizes)).toEqual([
      'XS',
      'S',
      'M',
      'L',
      'XL',
      '2XL',
      '3XL',
      'One Size',
      '4',
      '8',
      '9(29)',
      '10',
      '16W',
    ]);
  });

  it('orders combined and plus sizes next to their neighbours', () => {
    expect(sortSizes(['L', 'S/M', 'XL', 'M/L', 'S', 'M', 'L/XL'])).toEqual([
      'S',
      'S/M',
      'M',
      'M/L',
      'L',
      'L/XL',
      'XL',
    ]);
  });

  it('does not change the list it is given', () => {
    const sizes = ['L', 'S'];
    sortSizes(sizes);

    expect(sizes).toEqual(['L', 'S']);
  });
});

describe('listProductsSchema filters', () => {
  it('turns comma lists into arrays: trimmed, no empty parts, no duplicates', () => {
    const parsed = listProductsSchema.parse({ color: ' Black, white ,,black', size: 'M, L,M' });

    expect(parsed.color).toEqual(['black', 'white']);
    expect(parsed.size).toEqual(['M', 'L']);
  });

  it('keeps the case of sizes and lower-cases color keys', () => {
    const parsed = listProductsSchema.parse({ color: 'BLACK', size: '2XL,One Size' });

    expect(parsed.color).toEqual(['black']);
    expect(parsed.size).toEqual(['2XL', 'One Size']);
  });

  it('treats empty lists as not sent', () => {
    expect(listProductsSchema.parse({ color: '', size: '' })).toEqual({ sort: 'newest', page: 1, limit: 12 });
    expect(listProductsSchema.parse({ color: ',' }).color).toEqual([]);
  });

  it('allows up to 15 colors and 20 sizes, not more', () => {
    const many = (n) => Array.from({ length: n }, (_, i) => `v${i}`).join(',');

    expect(listProductsSchema.safeParse({ color: many(15) }).success).toBe(true);
    expect(listProductsSchema.safeParse({ color: many(16) }).success).toBe(false);
    expect(listProductsSchema.safeParse({ size: many(20) }).success).toBe(true);
    expect(listProductsSchema.safeParse({ size: many(21) }).success).toBe(false);
  });

  it('rejects an item longer than 20 characters', () => {
    expect(listProductsSchema.safeParse({ size: 'a'.repeat(21) }).success).toBe(false);
  });

  it('accepts a price range, and rejects a minimum above the maximum', () => {
    expect(listProductsSchema.safeParse({ minPriceCents: '2500', maxPriceCents: '4999' }).success).toBe(true);
    expect(listProductsSchema.safeParse({ minPriceCents: '5000', maxPriceCents: '5000' }).success).toBe(true);
    expect(listProductsSchema.safeParse({ minPriceCents: '5000', maxPriceCents: '4999' }).success).toBe(
      false,
    );
    expect(listProductsSchema.safeParse({ minPriceCents: '5000' }).success).toBe(true);
  });
});
