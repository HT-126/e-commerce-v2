import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createCartItem, createProduct, createUser, login } from '../helpers/db.js';

const app = createApp();
const quote = (items) => request(app).post('/api/cart/quote').send({ items });
const rowsOf = (user) =>
  db('cart_items').where({ user_id: user.id }).orderBy('variant_id').select('variant_id', 'quantity');
const quantities = (lines) => lines.map((line) => [line.variantId, line.quantity]);

// One product with one variant per stock number, so a test can pick the status it needs.
async function variantWithStock(stock, product = {}) {
  const { variants } = await createProduct({ variants: [{ color: 'Black', size: 'M', stock }], ...product });
  return variants[0].id;
}

beforeEach(cleanTables);
afterAll(() => db.destroy());

describe('POST /api/cart/quote', () => {
  it('prices a guest cart without signing in', async () => {
    const dress = await createProduct({
      slug: 'blue-dress',
      title: 'Blue Dress',
      priceCents: 4500,
      images: [{ url: 'https://cdn.example/blue.webp', alt: 'Blue' }],
      variants: [{ color: 'Blue', size: 'S', stock: 5 }],
    });
    const top = await createProduct({ priceCents: 2000, variants: [{ color: 'White', size: 'L', stock: 5 }] });

    const res = await quote([
      { variantId: dress.variants[0].id, quantity: 2 },
      { variantId: top.variants[0].id, quantity: 1 },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.data.lines[0]).toEqual({
      variantId: dress.variants[0].id,
      productSlug: 'blue-dress',
      title: 'Blue Dress',
      color: 'Blue',
      size: 'S',
      imageUrl: 'https://cdn.example/blue.webp',
      unitPriceCents: 4500,
      quantity: 2,
      lineTotalCents: 9000,
      status: 'ok',
    });
    expect(res.body.data.lines).toHaveLength(2);
    expect(res.body.data).toMatchObject({
      subtotalCents: 11000,
      shippingCents: 0,
      totalCents: 11000,
      canCheckout: true,
    });
  });

  it('adds flat shipping below $97.00', async () => {
    const id = await variantWithStock(5, { priceCents: 3000 });

    const res = await quote([{ variantId: id, quantity: 1 }]);

    expect(res.body.data).toMatchObject({ subtotalCents: 3000, shippingCents: 695, totalCents: 3695 });
  });

  it('returns an empty cart for no items', async () => {
    const res = await quote([]);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      lines: [],
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      canCheckout: false,
    });
  });

  it('leaves out variants that do not exist', async () => {
    const id = await variantWithStock(5);

    const res = await quote([
      { variantId: 999999, quantity: 1 },
      { variantId: id, quantity: 1 },
    ]);

    expect(res.status).toBe(200);
    expect(res.body.data.lines.map((line) => line.variantId)).toEqual([id]);
  });

  it('marks lines ok, not_enough or sold_out, and blocks checkout', async () => {
    const ok = await variantWithStock(5);
    const few = await variantWithStock(2);
    const none = await variantWithStock(0);

    const res = await quote([
      { variantId: ok, quantity: 3 },
      { variantId: few, quantity: 3 },
      { variantId: none, quantity: 1 },
    ]);

    expect(res.body.data.lines.map((line) => line.status)).toEqual(['ok', 'not_enough', 'sold_out']);
    expect(res.body.data.canCheckout).toBe(false);
    // Only the ok line is counted.
    expect(res.body.data.subtotalCents).toBe(3000 * 3);
  });

  it('keeps a variant of a hidden product as sold_out', async () => {
    const id = await variantWithStock(10, { isActive: false });

    const res = await quote([{ variantId: id, quantity: 1 }]);

    expect(res.body.data.lines).toHaveLength(1);
    expect(res.body.data.lines[0].status).toBe('sold_out');
  });

  it('never returns a stock number', async () => {
    const id = await variantWithStock(7);

    const res = await quote([{ variantId: id, quantity: 1 }]);

    expect(JSON.stringify(res.body)).not.toMatch(/stock/i);
  });

  it('makes one line per variant, with the larger quantity', async () => {
    const id = await variantWithStock(10);

    const res = await quote([
      { variantId: id, quantity: 2 },
      { variantId: id, quantity: 5 },
    ]);

    expect(quantities(res.body.data.lines)).toEqual([[id, 5]]);
  });

  it.each([
    ['quantity 0', [{ variantId: 1, quantity: 0 }]],
    ['quantity 10', [{ variantId: 1, quantity: 10 }]],
    ['a fractional quantity', [{ variantId: 1, quantity: 1.5 }]],
    ['a quantity sent as text', [{ variantId: 1, quantity: '2' }]],
    ['variant id 0', [{ variantId: 0, quantity: 1 }]],
    ['a variant id sent as text', [{ variantId: 'abc', quantity: 1 }]],
    ['a missing quantity', [{ variantId: 1 }]],
    ['51 items', Array.from({ length: 51 }, (_, i) => ({ variantId: i + 1, quantity: 1 }))],
  ])('rejects %s with 400', async (_name, items) => {
    const res = await quote(items);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a body without items with 400', async () => {
    const res = await request(app).post('/api/cart/quote').send({});

    expect(res.status).toBe(400);
  });

  it('accepts exactly 50 items', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ variantId: i + 1, quantity: 1 }));

    const res = await quote(items);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/cart', () => {
  it('needs a signed-in user', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns an empty cart for a new user', async () => {
    const agent = await login(app, await createUser());

    const res = await agent.get('/api/cart');

    expect(res.status).toBe(200);
    expect(res.body.data.lines).toEqual([]);
    expect(res.body.data.canCheckout).toBe(false);
  });

  it("returns the user's lines in the order they were added, and never another user's", async () => {
    const anna = await createUser();
    const ben = await createUser();
    const first = await variantWithStock(5);
    const second = await variantWithStock(5);
    await createCartItem({ user: anna, variantId: second, quantity: 2 });
    await createCartItem({ user: anna, variantId: first, quantity: 1 });
    await createCartItem({ user: ben, variantId: first, quantity: 9 });

    const res = await (await login(app, anna)).get('/api/cart');

    expect(quantities(res.body.data.lines)).toEqual([
      [second, 2],
      [first, 1],
    ]);
  });

  it('shows a line as sold_out when the stock ran out after it was added', async () => {
    const user = await createUser();
    const id = await variantWithStock(5);
    await createCartItem({ user, variantId: id, quantity: 1 });
    await db('variants').where({ id }).update({ stock: 0 });

    const res = await (await login(app, user)).get('/api/cart');

    expect(res.body.data.lines[0].status).toBe('sold_out');
    expect(JSON.stringify(res.body)).not.toMatch(/stock/i);
  });
});

describe('PUT /api/cart/items/:variantId', () => {
  it('adds a line and returns the cart', async () => {
    const user = await createUser();
    const id = await variantWithStock(5);

    const res = await (await login(app, user)).put(`/api/cart/items/${id}`).send({ quantity: 3 });

    expect(res.status).toBe(200);
    expect(quantities(res.body.data.lines)).toEqual([[id, 3]]);
    expect(await rowsOf(user)).toEqual([{ variant_id: id, quantity: 3 }]);
  });

  it('sets the quantity of an existing line (it does not add)', async () => {
    const user = await createUser();
    const id = await variantWithStock(5);
    await createCartItem({ user, variantId: id, quantity: 4 });

    const res = await (await login(app, user)).put(`/api/cart/items/${id}`).send({ quantity: 2 });

    expect(res.status).toBe(200);
    expect(await rowsOf(user)).toEqual([{ variant_id: id, quantity: 2 }]);
  });

  it('accepts a sold-out variant, which then shows as sold_out', async () => {
    const user = await createUser();
    const id = await variantWithStock(0);

    const res = await (await login(app, user)).put(`/api/cart/items/${id}`).send({ quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.lines[0].status).toBe('sold_out');
  });

  it("changes only the signed-in user's line", async () => {
    const anna = await createUser();
    const ben = await createUser();
    const id = await variantWithStock(5);
    await createCartItem({ user: ben, variantId: id, quantity: 7 });

    await (await login(app, anna)).put(`/api/cart/items/${id}`).send({ quantity: 1 });

    expect(await rowsOf(ben)).toEqual([{ variant_id: id, quantity: 7 }]);
    expect(await rowsOf(anna)).toEqual([{ variant_id: id, quantity: 1 }]);
  });

  it('needs a signed-in user', async () => {
    const id = await variantWithStock(5);

    const res = await request(app).put(`/api/cart/items/${id}`).send({ quantity: 1 });

    expect(res.status).toBe(401);
  });

  it.each([
    ['quantity 0', { quantity: 0 }],
    ['quantity 10', { quantity: 10 }],
    ['a quantity sent as text', { quantity: '2' }],
    ['no quantity', {}],
  ])('rejects %s with 400', async (_name, body) => {
    const user = await createUser();
    const id = await variantWithStock(5);

    const res = await (await login(app, user)).put(`/api/cart/items/${id}`).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await rowsOf(user)).toEqual([]);
  });

  it('rejects a variant id that is not a positive whole number with 400', async () => {
    const agent = await login(app, await createUser());

    for (const bad of ['abc', '0', '-1', '1.5']) {
      const res = await agent.put(`/api/cart/items/${bad}`).send({ quantity: 1 });
      expect(res.status, bad).toBe(400);
    }
  });

  it('returns 404 for a variant that does not exist', async () => {
    const agent = await login(app, await createUser());

    const res = await agent.put('/api/cart/items/999999').send({ quantity: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a variant of a hidden product', async () => {
    const user = await createUser();
    const id = await variantWithStock(5, { isActive: false });

    const res = await (await login(app, user)).put(`/api/cart/items/${id}`).send({ quantity: 1 });

    expect(res.status).toBe(404);
    expect(await rowsOf(user)).toEqual([]);
  });
});

describe('DELETE /api/cart/items/:variantId', () => {
  it('removes the line and returns the cart', async () => {
    const user = await createUser();
    const keep = await variantWithStock(5);
    const drop = await variantWithStock(5);
    await createCartItem({ user, variantId: keep, quantity: 1 });
    await createCartItem({ user, variantId: drop, quantity: 2 });

    const res = await (await login(app, user)).delete(`/api/cart/items/${drop}`);

    expect(res.status).toBe(200);
    expect(quantities(res.body.data.lines)).toEqual([[keep, 1]]);
    expect(await rowsOf(user)).toEqual([{ variant_id: keep, quantity: 1 }]);
  });

  it('removes a sold-out line', async () => {
    const user = await createUser();
    const id = await variantWithStock(0);
    await createCartItem({ user, variantId: id });

    const res = await (await login(app, user)).delete(`/api/cart/items/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.lines).toEqual([]);
  });

  it('answers 200 when the line is not in the cart', async () => {
    const agent = await login(app, await createUser());

    const res = await agent.delete('/api/cart/items/999999');

    expect(res.status).toBe(200);
    expect(res.body.data.lines).toEqual([]);
  });

  it("never removes another user's line", async () => {
    const anna = await createUser();
    const ben = await createUser();
    const id = await variantWithStock(5);
    await createCartItem({ user: ben, variantId: id, quantity: 3 });

    await (await login(app, anna)).delete(`/api/cart/items/${id}`);

    expect(await rowsOf(ben)).toEqual([{ variant_id: id, quantity: 3 }]);
  });

  it('needs a signed-in user', async () => {
    const id = await variantWithStock(5);

    const res = await request(app).delete(`/api/cart/items/${id}`);

    expect(res.status).toBe(401);
  });

  it('rejects a variant id that is not a number with 400', async () => {
    const agent = await login(app, await createUser());

    const res = await agent.delete('/api/cart/items/abc');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/cart/merge', () => {
  const merge = (agent, items) => agent.post('/api/cart/merge').send({ items });

  it('adds guest items that are not in the account cart yet', async () => {
    const user = await createUser();
    const a = await variantWithStock(5);
    const b = await variantWithStock(5);

    const res = await merge(await login(app, user), [
      { variantId: a, quantity: 2 },
      { variantId: b, quantity: 1 },
    ]);

    expect(res.status).toBe(200);
    expect(quantities(res.body.data.lines)).toEqual([
      [a, 2],
      [b, 1],
    ]);
    expect(await rowsOf(user)).toEqual([
      { variant_id: a, quantity: 2 },
      { variant_id: b, quantity: 1 },
    ]);
  });

  it('keeps the larger quantity when the variant is already in the account cart', async () => {
    const user = await createUser();
    const bigger = await variantWithStock(9);
    const smaller = await variantWithStock(9);
    await createCartItem({ user, variantId: bigger, quantity: 2 });
    await createCartItem({ user, variantId: smaller, quantity: 6 });

    await merge(await login(app, user), [
      { variantId: bigger, quantity: 5 },
      { variantId: smaller, quantity: 3 },
    ]);

    // 5 (not 2 + 5) and 6 (not 6 + 3, and not lowered to 3).
    expect(await rowsOf(user)).toEqual([
      { variant_id: bigger, quantity: 5 },
      { variant_id: smaller, quantity: 6 },
    ]);
  });

  it('changes nothing when the same items are sent again', async () => {
    const user = await createUser();
    const a = await variantWithStock(9);
    const b = await variantWithStock(9);
    await createCartItem({ user, variantId: a, quantity: 2 });
    const agent = await login(app, user);
    const items = [
      { variantId: a, quantity: 4 },
      { variantId: b, quantity: 3 },
    ];

    const first = await merge(agent, items);
    const second = await merge(agent, items);

    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
    expect(await rowsOf(user)).toEqual([
      { variant_id: a, quantity: 4 },
      { variant_id: b, quantity: 3 },
    ]);
  });

  it('skips variants that no longer exist', async () => {
    const user = await createUser();
    const real = await variantWithStock(5);

    const res = await merge(await login(app, user), [
      { variantId: 999999, quantity: 2 },
      { variantId: real, quantity: 1 },
    ]);

    expect(res.status).toBe(200);
    expect(quantities(res.body.data.lines)).toEqual([[real, 1]]);
    expect(await rowsOf(user)).toEqual([{ variant_id: real, quantity: 1 }]);
  });

  it('keeps sold-out variants, which show as sold_out', async () => {
    const user = await createUser();
    const soldOut = await variantWithStock(0);
    const hidden = await variantWithStock(5, { isActive: false });

    const res = await merge(await login(app, user), [
      { variantId: soldOut, quantity: 1 },
      { variantId: hidden, quantity: 1 },
    ]);

    expect(res.body.data.lines.map((line) => line.status)).toEqual(['sold_out', 'sold_out']);
    expect(await rowsOf(user)).toHaveLength(2);
  });

  it('never goes above 9', async () => {
    const user = await createUser();
    const id = await variantWithStock(20);
    await createCartItem({ user, variantId: id, quantity: 9 });

    await merge(await login(app, user), [{ variantId: id, quantity: 9 }]);

    expect(await rowsOf(user)).toEqual([{ variant_id: id, quantity: 9 }]);
  });

  it('merges the same variant sent twice into one line with the larger quantity', async () => {
    const user = await createUser();
    const id = await variantWithStock(9);

    await merge(await login(app, user), [
      { variantId: id, quantity: 2 },
      { variantId: id, quantity: 4 },
    ]);

    expect(await rowsOf(user)).toEqual([{ variant_id: id, quantity: 4 }]);
  });

  it('returns the account cart unchanged for no items', async () => {
    const user = await createUser();
    const id = await variantWithStock(5);
    await createCartItem({ user, variantId: id, quantity: 2 });

    const res = await merge(await login(app, user), []);

    expect(res.status).toBe(200);
    expect(quantities(res.body.data.lines)).toEqual([[id, 2]]);
  });

  it("never touches another user's cart", async () => {
    const anna = await createUser();
    const ben = await createUser();
    const id = await variantWithStock(9);
    await createCartItem({ user: ben, variantId: id, quantity: 7 });

    await merge(await login(app, anna), [{ variantId: id, quantity: 2 }]);

    expect(await rowsOf(ben)).toEqual([{ variant_id: id, quantity: 7 }]);
    expect(await rowsOf(anna)).toEqual([{ variant_id: id, quantity: 2 }]);
  });

  it('needs a signed-in user', async () => {
    const res = await request(app).post('/api/cart/merge').send({ items: [] });

    expect(res.status).toBe(401);
  });

  it('rejects invalid items with 400 and changes nothing', async () => {
    const user = await createUser();
    const id = await variantWithStock(5);

    const res = await merge(await login(app, user), [
      { variantId: id, quantity: 2 },
      { variantId: id, quantity: 10 },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await rowsOf(user)).toEqual([]);
  });
});
