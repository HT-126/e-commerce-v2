import { describe, expect, it } from 'vitest';
import { CLEARED_FILTERS, hasActiveFilters, readShopParams, toApiParams } from './shop-params.js';

const read = (query) => readShopParams(new URLSearchParams(query));

describe('readShopParams', () => {
  it('has defaults for an empty URL', () => {
    const params = read('');

    expect(params).toMatchObject({ sort: 'newest', color: [], size: [], q: '', page: 1 });
    expect(params.price.key).toBe('any');
  });

  it('reads color and size lists: trimmed, no empty parts, no duplicates', () => {
    const params = read('color=%20Black,white,,black&size=M,%20L,M');

    expect(params.color).toEqual(['black', 'white']);
    expect(params.size).toEqual(['M', 'L']);
  });

  it('keeps the case of sizes', () => {
    expect(read('size=2XL,One%20Size').size).toEqual(['2XL', 'One Size']);
  });

  it('gives a size the spelling of its option once the options are known', () => {
    const options = { sizes: ['M', 'XL', 'One Size'] };

    expect(readShopParams(new URLSearchParams('size=m,xl,one%20size'), options).size).toEqual([
      'M',
      'XL',
      'One Size',
    ]);
    expect(readShopParams(new URLSearchParams('size=m,M'), options).size).toEqual(['M']);
    expect(readShopParams(new URLSearchParams('size=99XL,m'), options).size).toEqual(['99XL', 'M']);
  });

  it('keeps sizes as typed while the options are not loaded yet', () => {
    expect(readShopParams(new URLSearchParams('size=m')).size).toEqual(['m']);
  });

  it('drops list items the API would reject (longer than 20 characters)', () => {
    expect(read(`size=${'a'.repeat(21)},M`).size).toEqual(['M']);
  });

  it('keeps at most 15 colors and 20 sizes', () => {
    const many = (n) => Array.from({ length: n }, (_, i) => `v${i}`).join(',');

    expect(read(`color=${many(30)}`).color).toHaveLength(15);
    expect(read(`size=${many(30)}`).size).toHaveLength(20);
  });

  it.each([
    ['under-25', '', '2499'],
    ['25-50', '2500', '4999'],
    ['50-75', '5000', '7499'],
    ['75-100', '7500', '9999'],
    ['100-plus', '10000', ''],
  ])('reads the price range %s', (key, min, max) => {
    expect(read(`minPriceCents=${min}&maxPriceCents=${max}`).price.key).toBe(key);
  });

  it.each([
    ['a price that is not one of the choices', 'maxPriceCents=3000'],
    ['a pair that does not match a choice', 'minPriceCents=2500&maxPriceCents=2499'],
    ['only half of a range', 'minPriceCents=2500'],
    ['text', 'minPriceCents=abc&maxPriceCents=xyz'],
  ])('ignores %s', (_name, query) => {
    expect(read(query).price.key).toBe('any');
  });

  it('falls back to defaults for a bad sort or page', () => {
    expect(read('sort=foo&page=1.5')).toMatchObject({ sort: 'newest', page: 1 });
    expect(read('page=0').page).toBe(1);
    expect(read('page=10001').page).toBe(1);
    expect(read('page=7').page).toBe(7);
  });

  it('cuts a search that is too long', () => {
    expect(read(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
  });
});

describe('hasActiveFilters', () => {
  it.each([
    ['color', 'color=black'],
    ['size', 'size=M'],
    ['price', 'maxPriceCents=2499'],
    ['search text', 'q=dress'],
  ])('is true with %s', (_name, query) => {
    expect(hasActiveFilters(read(query))).toBe(true);
  });

  it('is false with nothing, or with only a sort or page', () => {
    expect(hasActiveFilters(read(''))).toBe(false);
    expect(hasActiveFilters(read('sort=rating&page=3'))).toBe(false);
  });
});

describe('CLEARED_FILTERS', () => {
  it('resets color, size, price and search, but not the sort or page', () => {
    expect(Object.keys(CLEARED_FILTERS).sort()).toEqual([
      'color',
      'maxPriceCents',
      'minPriceCents',
      'q',
      'size',
    ]);
  });
});

describe('toApiParams', () => {
  it('turns the URL values into API values', () => {
    const params = read(
      'sort=rating&color=black,white&size=M&minPriceCents=2500&maxPriceCents=4999&q=red&page=2',
    );

    expect(toApiParams('dresses', params)).toEqual({
      category: 'dresses',
      sort: 'rating',
      minPriceCents: '2500',
      maxPriceCents: '4999',
      color: 'black,white',
      size: 'M',
      q: 'red',
      page: 2,
      limit: 12,
    });
  });
});
