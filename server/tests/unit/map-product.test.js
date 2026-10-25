import { describe, expect, it, vi } from 'vitest';
import { categorySlugFor, mapProduct } from '../../db/seed-lib/map-product.js';

const source = (overrides = {}) => ({
  id: 123,
  handle: 'test-dress',
  title: 'Test Dress',
  description_html: '<p class="lvo-hook">Hook</p>',
  price: { min_usd: 49.99 },
  images: [{ url: 'https://cdn.example/a.webp', alt: 'A', width: 10, height: 20 }],
  variants: [
    { sku: 'A1', in_stock: true, options: { Color: 'BLACK', Size: 'M' } },
    { sku: 'A2', in_stock: false, options: { Color: 'black', Size: 'M' } },
    { sku: 'A3', in_stock: false, options: { Color: 'Blush Pink', Size: 'XXL' } },
  ],
  metafields: { material: 'Cotton', fit: '', ai_summary: 'Summary' },
  reviews: { rating: 4.66, count: 5 },
  created_at: '2025-05-20T05:57:09Z',
  ...overrides,
});

describe('categorySlugFor', () => {
  it.each([
    ['Apparel & Accessories > Clothing > Dresses', 'dresses'],
    ['Apparel & Accessories > Clothing > Skirts', 'bottoms'],
    ['Apparel & Accessories > Clothing > Outfit Sets', 'sets'],
    ['Apparel & Accessories > Clothing > Lingerie', null],
    ['Apparel & Accessories > Jewelry > Rings', null],
  ])('%s -> %s', (path, slug) => {
    expect(categorySlugFor(path)).toBe(slug);
  });
});

describe('mapProduct', () => {
  it('maps price, rating and empty metafields', () => {
    const { product } = mapProduct(source());

    expect(product.price_cents).toBe(4999);
    expect(product.seed_rating_avg).toBe(4.7);
    expect(product.review_count).toBe(5);
    expect(product.material).toBe('Cotton');
    expect(product.fit).toBeNull();
    expect(product.description).toBe('Hook');
  });

  it('uses 0 reviews when the rating is null', () => {
    const { product } = mapProduct(source({ reviews: { rating: null, count: 3 } }));

    expect(product.rating_avg).toBeNull();
    expect(product.review_count).toBe(0);
  });

  it('sets the color group of each variant from the cleaned color name', () => {
    const { variants } = mapProduct(source());

    expect(variants.map((v) => [v.color_name, v.color_group])).toEqual([
      ['Black', 'black'],
      ['Blush Pink', 'pink'],
    ]);
  });

  it('seeds stock 10 or 0 and keeps the first of two variants that clean to the same value', () => {
    const warn = vi.fn();
    const { variants } = mapProduct(source(), warn);

    expect(variants.map((v) => [v.sku, v.color_name, v.size, v.stock, v.position])).toEqual([
      ['A1', 'Black', 'M', 10, 0],
      ['A3', 'Blush Pink', '2XL', 0, 2],
    ]);
    expect(warn).toHaveBeenCalledOnce();
  });
});
