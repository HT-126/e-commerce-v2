import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createCategory, createProduct } from '../helpers/db.js';

const app = createApp();
const get = (query) => request(app).get(`/api/products?${query}`);
const slugs = (res) => res.body.data.items.map((item) => item.slug).sort();

beforeEach(cleanTables);
afterAll(() => db.destroy());

describe('GET /api/products: color and size filters', () => {
  beforeEach(async () => {
    await createProduct({ slug: 'black-s', variants: [{ color: 'Black', size: 'S', stock: 5 }] });
    await createProduct({ slug: 'black-m', variants: [{ color: 'Black', size: 'M', stock: 5 }] });
    await createProduct({ slug: 'white-m', variants: [{ color: 'White', size: 'M', stock: 5 }] });
    await createProduct({ slug: 'navy-l', variants: [{ color: 'Navy', size: 'L', stock: 5 }] });
  });

  it('filters by one color group', async () => {
    expect(slugs(await get('color=black'))).toEqual(['black-m', 'black-s']);
  });

  it('matches a raw color name through its group (Navy is blue)', async () => {
    expect(slugs(await get('color=blue'))).toEqual(['navy-l']);
  });

  it('filters by several color groups', async () => {
    expect(slugs(await get('color=black,white'))).toEqual(['black-m', 'black-s', 'white-m']);
  });

  it('is not case sensitive for colors, and ignores spaces', async () => {
    expect(slugs(await get('color=%20Black%20,WHITE'))).toEqual(['black-m', 'black-s', 'white-m']);
  });

  it('filters by one size', async () => {
    expect(slugs(await get('size=M'))).toEqual(['black-m', 'white-m']);
  });

  it('filters by several sizes', async () => {
    expect(slugs(await get('size=S,L'))).toEqual(['black-s', 'navy-l']);
  });

  it('needs color and size on the same variant', async () => {
    await createProduct({
      slug: 'mixed',
      variants: [
        { color: 'Black', size: 'S', stock: 5 },
        { color: 'White', size: 'M', stock: 5 },
      ],
    });

    // "mixed" has a black variant and an M variant, but no black M.
    expect(slugs(await get('color=black&size=M'))).toEqual(['black-m']);
  });

  it('a product matches when any of its variants matches', async () => {
    await createProduct({
      slug: 'two-colors',
      variants: [
        { color: 'Red', size: 'M', stock: 5 },
        { color: 'Black', size: 'M', stock: 5 },
      ],
    });

    expect(slugs(await get('color=black&size=M'))).toEqual(['black-m', 'two-colors']);
  });

  it('never matches a sold-out variant, but the product stays in the unfiltered list', async () => {
    await createProduct({
      slug: 'black-m-gone',
      variants: [
        { color: 'Black', size: 'M', stock: 0 },
        { color: 'Black', size: 'S', stock: 3 },
      ],
    });

    expect(slugs(await get('color=black&size=M'))).toEqual(['black-m']);
    expect(slugs(await get('color=black'))).toContain('black-m-gone');
    expect(slugs(await get(''))).toContain('black-m-gone');
  });

  it('gives an empty list for an unknown color or size', async () => {
    const colors = await get('color=nope');
    const sizes = await get('size=99XL');

    expect(colors.status).toBe(200);
    expect(colors.body.data).toMatchObject({ items: [], total: 0 });
    expect(sizes.body.data).toMatchObject({ items: [], total: 0 });
  });

  it('treats empty lists as not sent', async () => {
    expect((await get('color=&size=')).body.data.total).toBe(4);
    expect((await get('color=,')).body.data.total).toBe(4);
  });

  it('counts the total after filtering', async () => {
    const res = await get('color=black&limit=1');

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.total).toBe(2);
  });

  it('never shows inactive products', async () => {
    await createProduct({
      slug: 'hidden',
      isActive: false,
      variants: [{ color: 'Black', size: 'M', stock: 5 }],
    });

    expect(slugs(await get('color=black'))).toEqual(['black-m', 'black-s']);
  });

  it('never returns a stock number', async () => {
    const res = await get('color=black&size=M');

    expect(JSON.stringify(res.body)).not.toMatch(/"stock"/);
  });
});

describe('GET /api/products: price range', () => {
  beforeEach(async () => {
    for (const cents of [2499, 2500, 4999, 5000, 10000]) {
      await createProduct({ slug: `p${cents}`, priceCents: cents });
    }
  });

  it('includes the minimum and the maximum', async () => {
    const res = await get('minPriceCents=2500&maxPriceCents=4999');

    expect(slugs(res)).toEqual(['p2500', 'p4999']);
  });

  it('works with only a minimum ($100+)', async () => {
    expect(slugs(await get('minPriceCents=10000'))).toEqual(['p10000']);
  });

  it('works with only a maximum (under $25)', async () => {
    expect(slugs(await get('maxPriceCents=2499'))).toEqual(['p2499']);
  });

  it('gives 400 when the minimum is above the maximum', async () => {
    const res = await get('minPriceCents=5000&maxPriceCents=2500');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts the same value for both', async () => {
    expect(slugs(await get('minPriceCents=5000&maxPriceCents=5000'))).toEqual(['p5000']);
  });
});

describe('GET /api/products: filters together with category, search, sort and paging', () => {
  it('combines everything', async () => {
    const dresses = await createCategory({ slug: 'dresses' });
    const tops = await createCategory({ slug: 'tops' });
    const black = [{ color: 'Black', size: 'M', stock: 5 }];
    await createProduct({
      slug: 'match-cheap',
      category: dresses,
      title: 'Red Dress',
      priceCents: 3000,
      variants: black,
    });
    await createProduct({
      slug: 'match-pricey',
      category: dresses,
      title: 'Red Dress 2',
      priceCents: 4500,
      variants: black,
    });
    await createProduct({
      slug: 'wrong-category',
      category: tops,
      title: 'Red Top',
      priceCents: 3000,
      variants: black,
    });
    await createProduct({
      slug: 'wrong-price',
      category: dresses,
      title: 'Red Dress 3',
      priceCents: 9000,
      variants: black,
    });
    await createProduct({
      slug: 'wrong-title',
      category: dresses,
      title: 'Blue Dress',
      priceCents: 3000,
      variants: black,
    });
    await createProduct({
      slug: 'wrong-size',
      category: dresses,
      title: 'Red Dress 4',
      priceCents: 3000,
      variants: [{ color: 'Black', size: 'S', stock: 5 }],
    });

    const res = await get(
      'category=dresses&q=red&color=black&size=M&minPriceCents=2500&maxPriceCents=4999&sort=price_desc',
    );

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((item) => item.slug)).toEqual(['match-pricey', 'match-cheap']);
    expect(res.body.data.total).toBe(2);
  });

  it('pages through the filtered list', async () => {
    for (let i = 1; i <= 5; i++) {
      await createProduct({
        slug: `black${i}`,
        priceCents: i * 100,
        variants: [{ color: 'Black', size: 'M', stock: 1 }],
      });
    }
    await createProduct({
      slug: 'white',
      priceCents: 50,
      variants: [{ color: 'White', size: 'M', stock: 1 }],
    });

    const first = await get('color=black&sort=price_asc&limit=2&page=1');
    const last = await get('color=black&sort=price_asc&limit=2&page=3');

    expect(first.body.data.items.map((i) => i.slug)).toEqual(['black1', 'black2']);
    expect(last.body.data.items.map((i) => i.slug)).toEqual(['black5']);
    expect(last.body.data.total).toBe(5);
  });
});

describe('GET /api/products: filter input limits', () => {
  it('gives 400 for more than 15 colors', async () => {
    const colors = Array.from({ length: 16 }, (_, i) => `c${i}`).join(',');

    expect((await get(`color=${colors}`)).status).toBe(400);
  });

  it('gives 400 for more than 20 sizes', async () => {
    const sizes = Array.from({ length: 21 }, (_, i) => `s${i}`).join(',');

    expect((await get(`size=${sizes}`)).status).toBe(400);
  });

  it('gives 400 for a value longer than 20 characters', async () => {
    expect((await get(`size=${'a'.repeat(21)}`)).status).toBe(400);
  });

  it('gives 400 for a parameter repeated in the URL (the lists are comma separated)', async () => {
    expect((await get('color=black&color=white')).status).toBe(400);
  });

  it('is safe against SQL in the values', async () => {
    await createProduct({ slug: 'one' });

    const res = await get(
      `size=${encodeURIComponent("M') OR 1=1 --")}&color=${encodeURIComponent("black' OR '1'='1")}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });
});
