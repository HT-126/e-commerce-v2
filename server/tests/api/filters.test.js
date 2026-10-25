import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createProduct } from '../helpers/db.js';

const app = createApp();
const get = () => request(app).get('/api/filters');

function keysOf(value) {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
  }
  return [];
}

beforeEach(cleanTables);
afterAll(() => db.destroy());

describe('GET /api/filters', () => {
  it('returns the color groups and sizes that exist, in a fixed order', async () => {
    await createProduct({
      variants: [
        { color: 'Navy', size: 'XL', stock: 1 },
        { color: 'Black', size: 'M', stock: 1 },
        { color: 'Black', size: '10', stock: 1 },
        { color: 'Floral', size: 'One Size', stock: 1 },
        { color: 'Black', size: 'S', stock: 1 },
        { color: 'Black', size: '8', stock: 1 },
      ],
    });

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.data.colors).toEqual([
      { key: 'black', label: 'Black' },
      { key: 'blue', label: 'Blue' },
      { key: 'multicolor', label: 'Multicolor' },
    ]);
    expect(res.body.data.sizes).toEqual(['S', 'M', 'XL', 'One Size', '8', '10']);
  });

  it('lists each size once, across products', async () => {
    await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 1 }] });
    await createProduct({ variants: [{ color: 'White', size: 'M', stock: 1 }] });

    const res = await get();

    expect(res.body.data.sizes).toEqual(['M']);
    expect(res.body.data.colors.map((c) => c.key)).toEqual(['black', 'white']);
  });

  it('ignores inactive products', async () => {
    await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 1 }] });
    await createProduct({ isActive: false, variants: [{ color: 'Red', size: '3XL', stock: 1 }] });

    const res = await get();

    expect(res.body.data.colors.map((c) => c.key)).toEqual(['black']);
    expect(res.body.data.sizes).toEqual(['M']);
  });

  it('still lists the options of a sold-out product', async () => {
    await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 0 }] });

    const res = await get();

    expect(res.body.data.sizes).toEqual(['M']);
  });

  it('returns empty lists when there are no products', async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ colors: [], sizes: [] });
  });

  it('never returns a stock number', async () => {
    await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 9 }] });

    const res = await get();

    expect(keysOf(res.body)).not.toContain('stock');
  });
});
