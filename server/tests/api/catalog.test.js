import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createCategory, createProduct } from '../helpers/db.js';

const app = createApp();
const get = (url) => request(app).get(url);
const slugs = (res) => res.body.data.items.map((item) => item.slug);
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Customers learn "in stock or not", never the number: no object may have a `stock` key.
function keysOf(value) {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
  }
  return [];
}

beforeEach(cleanTables);
afterAll(() => db.destroy());

describe('GET /api/categories', () => {
  it('returns the categories in menu order', async () => {
    await createCategory({ name: 'Dresses', slug: 'dresses', position: 2 });
    await createCategory({ name: 'Tops', slug: 'tops', position: 1 });

    const res = await get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.map((c) => c.slug)).toEqual(['tops', 'dresses']);
    expect(res.body.data[0]).toEqual({ id: expect.any(Number), name: 'Tops', slug: 'tops' });
  });
});

describe('GET /api/products', () => {
  it('returns product cards with the main photo and a numeric rating', async () => {
    await createProduct({
      slug: 'blue-dress',
      title: 'Blue Dress',
      priceCents: 4599,
      ratingAvg: '4.7',
      reviewCount: 7,
      images: [
        { url: 'https://cdn.example/a.webp', alt: 'Front' },
        { url: 'https://cdn.example/b.webp', alt: 'Back' },
      ],
    });

    const res = await get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      items: [
        {
          id: expect.any(Number),
          slug: 'blue-dress',
          title: 'Blue Dress',
          priceCents: 4599,
          ratingAvg: 4.7,
          reviewCount: 7,
          imageUrl: 'https://cdn.example/a.webp',
          imageAlt: 'Front',
          soldOut: false,
        },
      ],
      page: 1,
      limit: 12,
      total: 1,
    });
  });

  it('never returns inactive products', async () => {
    await createProduct({ slug: 'visible' });
    await createProduct({ slug: 'hidden', isActive: false });

    const res = await get('/api/products');

    expect(slugs(res)).toEqual(['visible']);
    expect(res.body.data.total).toBe(1);
  });

  it('never returns a stock number', async () => {
    await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 7 }] });

    const res = await get('/api/products');

    expect(keysOf(res.body)).not.toContain('stock');
  });

  describe('sort', () => {
    it('defaults to newest first', async () => {
      await createProduct({ slug: 'old', createdAt: daysAgo(10) });
      await createProduct({ slug: 'new', createdAt: daysAgo(1) });

      expect(slugs(await get('/api/products'))).toEqual(['new', 'old']);
      expect(slugs(await get('/api/products?sort=newest'))).toEqual(['new', 'old']);
    });

    it('newest: products with the same creation time are ordered by id, newest id first', async () => {
      const sameTime = new Date('2026-01-01T10:00:00Z');
      await createProduct({ slug: 'first', createdAt: sameTime });
      await createProduct({ slug: 'second', createdAt: sameTime });
      await createProduct({ slug: 'third', createdAt: sameTime });

      expect(slugs(await get('/api/products?sort=newest'))).toEqual(['third', 'second', 'first']);
    });

    it('rating: highest first, more reviews win a tie, no rating last', async () => {
      await createProduct({ slug: 'unrated' });
      await createProduct({ slug: 'four', ratingAvg: 4.0, reviewCount: 3 });
      await createProduct({ slug: 'five-few', ratingAvg: 5.0, reviewCount: 2 });
      await createProduct({ slug: 'five-many', ratingAvg: 5.0, reviewCount: 9 });

      const res = await get('/api/products?sort=rating');

      expect(slugs(res)).toEqual(['five-many', 'five-few', 'four', 'unrated']);
    });

    it('price_asc and price_desc', async () => {
      await createProduct({ slug: 'mid', priceCents: 3000 });
      await createProduct({ slug: 'cheap', priceCents: 1000 });
      await createProduct({ slug: 'pricey', priceCents: 9000 });

      expect(slugs(await get('/api/products?sort=price_asc'))).toEqual(['cheap', 'mid', 'pricey']);
      expect(slugs(await get('/api/products?sort=price_desc'))).toEqual(['pricey', 'mid', 'cheap']);
    });
  });

  describe('filters', () => {
    it('filters by category slug, and an unknown slug gives an empty list', async () => {
      const dresses = await createCategory({ slug: 'dresses' });
      const tops = await createCategory({ slug: 'tops' });
      await createProduct({ slug: 'a-dress', category: dresses });
      await createProduct({ slug: 'a-top', category: tops });

      expect(slugs(await get('/api/products?category=dresses'))).toEqual(['a-dress']);
      const unknown = await get('/api/products?category=nope');
      expect(unknown.status).toBe(200);
      expect(unknown.body.data).toMatchObject({ items: [], total: 0 });
    });

    it('maxPriceCents includes the limit itself', async () => {
      await createProduct({ slug: 'at-limit', priceCents: 4499 });
      await createProduct({ slug: 'over', priceCents: 4500 });

      expect(slugs(await get('/api/products?maxPriceCents=4499'))).toEqual(['at-limit']);
    });

    it('searches the title, ignoring case', async () => {
      await createProduct({ slug: 'one', title: 'Floral Midi Dress' });
      await createProduct({ slug: 'two', title: 'Plain Tee' });

      expect(slugs(await get('/api/products?q=midi'))).toEqual(['one']);
    });

    it('searches % and _ as plain text, not as wildcards', async () => {
      await createProduct({ slug: 'percent', title: '100% Cotton Tee' });
      await createProduct({ slug: 'underscore', title: 'Snake_Case Tee' });
      await createProduct({ slug: 'plain', title: 'Plain Tee' });

      expect(slugs(await get('/api/products?q=%25'))).toEqual(['percent']);
      expect(slugs(await get('/api/products?q=_'))).toEqual(['underscore']);
    });

    it('treats empty filter values as not sent', async () => {
      await createProduct({ slug: 'one' });

      const res = await get('/api/products?q=&category=&maxPriceCents=&sort=&page=&limit=');

      expect(res.status).toBe(200);
      expect(slugs(res)).toEqual(['one']);
    });

    it('combines category, price and search', async () => {
      const dresses = await createCategory({ slug: 'dresses' });
      await createProduct({ slug: 'match', category: dresses, title: 'Red Dress', priceCents: 3000 });
      await createProduct({ slug: 'too-pricey', category: dresses, title: 'Red Dress 2', priceCents: 9000 });
      await createProduct({ slug: 'wrong-title', category: dresses, title: 'Blue Dress', priceCents: 3000 });

      const res = await get('/api/products?category=dresses&maxPriceCents=4000&q=red');

      expect(slugs(res)).toEqual(['match']);
    });
  });

  describe('paging', () => {
    it('returns the requested page with the total', async () => {
      for (let i = 1; i <= 5; i++) await createProduct({ slug: `p${i}`, priceCents: i * 100 });

      const first = await get('/api/products?sort=price_asc&limit=2&page=1');
      const last = await get('/api/products?sort=price_asc&limit=2&page=3');

      expect(slugs(first)).toEqual(['p1', 'p2']);
      expect(slugs(last)).toEqual(['p5']);
      expect(last.body.data).toMatchObject({ page: 3, limit: 2, total: 5 });
    });

    it('keeps the order stable when products share a price', async () => {
      for (let i = 1; i <= 4; i++) await createProduct({ slug: `same${i}`, priceCents: 1000 });

      const one = await get('/api/products?sort=price_asc&limit=2&page=1');
      const two = await get('/api/products?sort=price_asc&limit=2&page=2');

      // Same price: the id tie-break gives one fixed order, so no product repeats or goes missing.
      expect([...slugs(one), ...slugs(two)]).toEqual(['same1', 'same2', 'same3', 'same4']);
    });
  });

  describe('invalid input', () => {
    it.each([
      ['limit above 48', 'limit=49'],
      ['limit 0', 'limit=0'],
      ['page 0', 'page=0'],
      ['page not a number', 'page=abc'],
      ['page above the maximum', 'page=10001'],
      ['unknown sort', 'sort=cheapest'],
      ['negative price', 'maxPriceCents=-1'],
      ['search longer than 100 characters', `q=${'a'.repeat(101)}`],
    ])('%s gives 400 VALIDATION_ERROR', async (_name, query) => {
      const res = await get(`/api/products?${query}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts the largest allowed limit', async () => {
      expect((await get('/api/products?limit=48')).status).toBe(200);
    });
  });

  describe('sold out', () => {
    it('is true only when every variant has no stock', async () => {
      await createProduct({
        slug: 'all-gone',
        variants: [
          { color: 'Black', size: 'S', stock: 0 },
          { color: 'Black', size: 'M', stock: 0 },
        ],
      });
      await createProduct({
        slug: 'one-left',
        variants: [
          { color: 'Black', size: 'S', stock: 0 },
          { color: 'Black', size: 'M', stock: 1 },
        ],
      });

      const res = await get('/api/products');
      const soldOut = Object.fromEntries(res.body.data.items.map((i) => [i.slug, i.soldOut]));

      expect(soldOut).toEqual({ 'all-gone': true, 'one-left': false });
    });
  });
});

describe('GET /api/products/:slug', () => {
  it('returns the full product with colors, sizes and variants in display order', async () => {
    const category = await createCategory({ name: 'Dresses', slug: 'dresses' });
    await createProduct({
      category,
      slug: 'midi-dress',
      title: 'Midi Dress',
      priceCents: 3999,
      ratingAvg: '4.7',
      reviewCount: 7,
      description: 'A nice dress.',
      highlights: JSON.stringify(['Soft', 'Easy']),
      styling_note: 'Wear it with sneakers.',
      size_chart: JSON.stringify({ headers: ['Size', 'Bust'], rows: [['S', '34']] }),
      material: 'Cotton',
      fit: 'Relaxed',
      sizing_notes: 'True to size.',
      images: [
        { url: 'https://cdn.example/a.webp', alt: 'Front' },
        { url: 'https://cdn.example/b.webp', alt: 'Back' },
      ],
      variants: [
        { color: 'Gray', size: 'S', stock: 5 },
        { color: 'Gray', size: 'M', stock: 0 },
        { color: 'Black', size: 'S', stock: 3 },
        { color: 'Black', size: 'M', stock: 3 },
      ],
    });

    const res = await get('/api/products/midi-dress');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      slug: 'midi-dress',
      title: 'Midi Dress',
      description: 'A nice dress.',
      category: { name: 'Dresses', slug: 'dresses' },
      priceCents: 3999,
      ratingAvg: 4.7,
      reviewCount: 7,
      material: 'Cotton',
      fit: 'Relaxed',
      sizingNotes: 'True to size.',
      highlights: ['Soft', 'Easy'],
      stylingNote: 'Wear it with sneakers.',
      sizeChart: { headers: ['Size', 'Bust'], rows: [['S', '34']] },
      colors: ['Gray', 'Black'],
      sizes: ['S', 'M'],
    });
    expect(res.body.data.images.map((i) => i.alt)).toEqual(['Front', 'Back']);
    expect(res.body.data.images[0]).toEqual({
      url: 'https://cdn.example/a.webp',
      alt: 'Front',
      width: 800,
      height: 1000,
    });
    expect(res.body.data.variants.map((v) => [v.color, v.size, v.inStock])).toEqual([
      ['Gray', 'S', true],
      ['Gray', 'M', false],
      ['Black', 'S', true],
      ['Black', 'M', true],
    ]);
  });

  it('returns an empty highlights list and a null size chart when the data has none', async () => {
    await createProduct({ slug: 'plain' });

    const res = await get('/api/products/plain');

    expect(res.body.data.highlights).toEqual([]);
    expect(res.body.data.sizeChart).toBeNull();
    expect(res.body.data.ratingAvg).toBeNull();
  });

  it('never returns a stock number', async () => {
    await createProduct({ slug: 'stocked', variants: [{ color: 'Black', size: 'M', stock: 42 }] });

    const res = await get('/api/products/stocked');

    expect(keysOf(res.body)).not.toContain('stock');
  });

  it('gives 404 for an unknown slug', async () => {
    const res = await get('/api/products/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('gives 404 for an inactive product', async () => {
    await createProduct({ slug: 'hidden', isActive: false });

    expect((await get('/api/products/hidden')).status).toBe(404);
  });
});

describe('GET /api/products/:slug/related', () => {
  it('returns up to 4 active products from the same category, newest first, without the product itself', async () => {
    const dresses = await createCategory({ slug: 'dresses' });
    const tops = await createCategory({ slug: 'tops' });
    await createProduct({ category: dresses, slug: 'main', createdAt: daysAgo(0) });
    for (let i = 1; i <= 5; i++) {
      await createProduct({ category: dresses, slug: `d${i}`, createdAt: daysAgo(i) });
    }
    await createProduct({ category: dresses, slug: 'inactive', isActive: false, createdAt: daysAgo(0.5) });
    await createProduct({ category: tops, slug: 'other-category' });

    const res = await get('/api/products/main/related');

    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.slug)).toEqual(['d1', 'd2', 'd3', 'd4']);
    expect(res.body.data[0]).toHaveProperty('priceCents');
    expect(keysOf(res.body)).not.toContain('stock');
  });

  it('returns an empty list when the product is alone in its category', async () => {
    await createProduct({ slug: 'alone' });

    const res = await get('/api/products/alone/related');

    expect(res.body.data).toEqual([]);
  });

  it('gives 404 for an unknown or inactive product', async () => {
    await createProduct({ slug: 'hidden', isActive: false });

    expect((await get('/api/products/nope/related')).status).toBe(404);
    expect((await get('/api/products/hidden/related')).status).toBe(404);
  });
});
