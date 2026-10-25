import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import {
  cleanTables,
  createCartItem,
  createOrder,
  createProduct,
  createUser,
  login,
} from '../helpers/db.js';

const app = createApp();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const stockOf = async (variantId) => (await db('variants').where({ id: variantId }).first()).stock;
const ordersOf = (user) => db('orders').where({ user_id: user.id });
const cartRowsOf = (user) => db('cart_items').where({ user_id: user.id });
const keysIn = (res) => JSON.stringify(res.body);

// A product with one variant and `stock` units. Returns the product and that variant's id.
async function stocked(stock, product = {}) {
  const created = await createProduct({ variants: [{ color: 'Black', size: 'M', stock }], ...product });
  return { product: created, variantId: created.variants[0].id };
}

// Puts `quantity` of a variant in the user's bag, and signs the user in.
async function shopper(variantId, quantity = 1) {
  const user = await createUser();
  await createCartItem({ user, variantId, quantity });
  return { user, agent: await login(app, user) };
}

beforeEach(cleanTables);
afterAll(() => db.destroy());

describe('POST /api/orders', () => {
  it('places a paid order, takes the stock and empties the bag', async () => {
    const { variantId } = await stocked(5, {
      slug: 'blue-dress',
      title: 'Blue Dress',
      priceCents: 3000,
      images: [{ url: 'https://cdn.example/blue.webp', alt: 'Blue' }],
    });
    const { user, agent } = await shopper(variantId, 2);

    const res = await agent.post('/api/orders');

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      orderNumber: expect.stringMatching(/^LM-\d{6}-\d{4}$/),
      status: 'paid',
      createdAt: expect.any(String),
      items: [
        {
          productSlug: 'blue-dress',
          title: 'Blue Dress',
          color: 'Black',
          size: 'M',
          imageUrl: 'https://cdn.example/blue.webp',
          unitPriceCents: 3000,
          quantity: 2,
          lineTotalCents: 6000,
        },
      ],
      subtotalCents: 6000,
      shippingCents: 695,
      totalCents: 6695,
    });

    // Stored: one paid order with a copy of the email, one item that points at the product and variant.
    const [order] = await ordersOf(user);
    expect(order).toMatchObject({
      order_number: res.body.data.orderNumber,
      status: 'paid',
      subtotal_cents: 6000,
      shipping_cents: 695,
      total_cents: 6695,
      email: user.email,
    });
    const [item] = await db('order_items').where({ order_id: order.id });
    expect(item).toMatchObject({ variant_id: variantId, quantity: 2, line_total_cents: 6000 });
    expect(await stockOf(variantId)).toBe(3);
    expect(await cartRowsOf(user)).toEqual([]);
  });

  it('has free shipping from $97.00', async () => {
    const { variantId } = await stocked(5, { priceCents: 5000 });
    const { agent } = await shopper(variantId, 2);

    const res = await agent.post('/api/orders');

    expect(res.body.data).toMatchObject({ subtotalCents: 10000, shippingCents: 0, totalCents: 10000 });
  });

  it('takes the stock of every line of a bag with several lines', async () => {
    const first = await stocked(5, { priceCents: 2000 });
    const second = await stocked(4, { priceCents: 1500 });
    const user = await createUser();
    await createCartItem({ user, variantId: first.variantId, quantity: 2 });
    await createCartItem({ user, variantId: second.variantId, quantity: 3 });

    const res = await (await login(app, user)).post('/api/orders');

    expect(res.status).toBe(201);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.subtotalCents).toBe(2000 * 2 + 1500 * 3);
    expect(await stockOf(first.variantId)).toBe(3);
    expect(await stockOf(second.variantId)).toBe(1);
  });

  it("does not touch another user's bag or stock they did not buy", async () => {
    const { variantId } = await stocked(5);
    const { agent } = await shopper(variantId, 1);
    const other = await createUser();
    await createCartItem({ user: other, variantId, quantity: 4 });

    await agent.post('/api/orders');

    expect(await cartRowsOf(other)).toHaveLength(1);
    expect(await ordersOf(other)).toEqual([]);
    expect(await stockOf(variantId)).toBe(4);
  });

  it('answers 400 CART_EMPTY for an empty bag, and makes no order', async () => {
    const user = await createUser();

    const res = await (await login(app, user)).post('/api/orders');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CART_EMPTY');
    expect(await ordersOf(user)).toEqual([]);
  });

  it.each([
    ['sold out', { stock: 0 }, 1],
    ['not enough stock', { stock: 2 }, 3],
    ['a hidden product', { stock: 10, isActive: false }, 1],
  ])('answers 400 CART_NOT_READY for a line that is %s, and changes nothing', async (_name, options, quantity) => {
    const good = await stocked(5);
    const bad = await stocked(options.stock, { isActive: options.isActive ?? true });
    const user = await createUser();
    await createCartItem({ user, variantId: good.variantId, quantity: 1 });
    await createCartItem({ user, variantId: bad.variantId, quantity });

    const res = await (await login(app, user)).post('/api/orders');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CART_NOT_READY');
    expect(await ordersOf(user)).toEqual([]);
    expect(await cartRowsOf(user)).toHaveLength(2);
    expect(await stockOf(good.variantId)).toBe(5);
    expect(await stockOf(bad.variantId)).toBe(options.stock);
  });

  it('needs a signed-in user', async () => {
    const res = await request(app).post('/api/orders');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('never returns a stock number', async () => {
    const { variantId } = await stocked(5);
    const { agent } = await shopper(variantId);

    const res = await agent.post('/api/orders');

    expect(keysIn(res)).not.toContain('"stock"');
  });
});

describe('POST /api/orders when the stock changes while paying', () => {
  // Holds a lock on a variant, like a buyer who is just paying for it. The order below reads its bag
  // (the line still looks fine), then waits for this lock at the stock update. When the lock is let go
  // the stock is gone: exactly the "two buyers of the last item" moment, without depending on timing.
  async function holdLock(variantIds) {
    const blocker = await db.transaction();
    await blocker('variants').whereIn('id', variantIds).forUpdate();
    return {
      async sellOut() {
        await blocker('variants').whereIn('id', variantIds).update({ stock: 0 });
        await blocker.commit();
      },
    };
  }

  it('answers 409 STOCK_CHANGED naming the line, makes no order and keeps the bag', async () => {
    const { variantId } = await stocked(1, { title: 'Last Dress' });
    const { user, agent } = await shopper(variantId);
    const lock = await holdLock([variantId]);

    const paying = Promise.resolve(agent.post('/api/orders'));
    await sleep(300);
    await lock.sellOut();
    const res = await paying;

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STOCK_CHANGED');
    expect(res.body.error.details).toEqual([{ variantId, title: 'Last Dress', color: 'Black', size: 'M' }]);
    expect(await ordersOf(user)).toEqual([]);
    expect(await cartRowsOf(user)).toHaveLength(1);
    expect(await stockOf(variantId)).toBe(0);
  });

  it('is all or nothing: a line that was taken is given back when a later line fails', async () => {
    const first = await stocked(5, { title: 'Plenty' });
    const second = await stocked(1, { title: 'Last One' });
    const user = await createUser();
    await createCartItem({ user, variantId: first.variantId, quantity: 2 });
    await createCartItem({ user, variantId: second.variantId, quantity: 1 });
    const lock = await holdLock([second.variantId]);

    const paying = Promise.resolve((await login(app, user)).post('/api/orders'));
    await sleep(300);
    await lock.sellOut();
    const res = await paying;

    expect(res.status).toBe(409);
    expect(res.body.error.details.map((line) => line.title)).toEqual(['Last One']);
    expect(await stockOf(first.variantId)).toBe(5);
    expect(await ordersOf(user)).toEqual([]);
    expect(await cartRowsOf(user)).toHaveLength(2);
  });

  it('lists every line that could not be taken', async () => {
    const first = await stocked(1, { title: 'Gone A' });
    const second = await stocked(1, { title: 'Gone B' });
    const user = await createUser();
    await createCartItem({ user, variantId: first.variantId, quantity: 1 });
    await createCartItem({ user, variantId: second.variantId, quantity: 1 });
    const lock = await holdLock([first.variantId, second.variantId]);

    const paying = Promise.resolve((await login(app, user)).post('/api/orders'));
    await sleep(300);
    await lock.sellOut();
    const res = await paying;

    expect(res.status).toBe(409);
    expect(res.body.error.details.map((line) => line.title)).toEqual(['Gone A', 'Gone B']);
  });

  it('lets only one of two buyers of the last item win, and stock ends at 0', async () => {
    const { variantId } = await stocked(1);
    const anna = await shopper(variantId);
    const ben = await shopper(variantId);

    const [a, b] = await Promise.all([anna.agent.post('/api/orders'), ben.agent.post('/api/orders')]);

    const statuses = [a.status, b.status];
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    // The loser is told 409 when it was already paying. If the winner finished before it even read its
    // bag, it sees the line as sold out and gets 400 instead. Either way nothing is charged.
    const loser = a.status === 201 ? b : a;
    expect([409, 400]).toContain(loser.status);
    expect(['STOCK_CHANGED', 'CART_NOT_READY']).toContain(loser.body.error.code);

    expect(await stockOf(variantId)).toBe(0);
    expect(await db('orders').count({ total: '*' }).first()).toMatchObject({ total: 1 });
    const loserUser = a.status === 201 ? ben.user : anna.user;
    expect(await ordersOf(loserUser)).toEqual([]);
    expect(await cartRowsOf(loserUser)).toHaveLength(1);
  });

  it('makes one order when the same user pays twice at once', async () => {
    const { variantId } = await stocked(10);
    const { user, agent } = await shopper(variantId, 2);

    const [a, b] = await Promise.all([agent.post('/api/orders'), agent.post('/api/orders')]);

    expect([a.status, b.status].sort()).toEqual([201, 400]);
    const refused = a.status === 400 ? a : b;
    expect(refused.body.error.code).toBe('CART_EMPTY');
    expect(await ordersOf(user)).toHaveLength(1);
    expect(await stockOf(variantId)).toBe(8);
  });
});

describe('GET /api/orders', () => {
  it('needs a signed-in user', async () => {
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(401);
  });

  it('returns an empty page for a user with no orders', async () => {
    const res = await (await login(app, await createUser())).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ items: [], page: 1, limit: 10, total: 0 });
  });

  it('lists only my orders, newest first, with the number of units', async () => {
    const me = await createUser();
    const other = await createUser();
    const product = await createProduct({ priceCents: 3000 });
    await createOrder({ user: me, product, orderNumber: 'LM-261001-0001', createdAt: daysAgo(5) });
    await createOrder({ user: me, product, quantity: 3, orderNumber: 'LM-261003-0003', createdAt: daysAgo(1) });
    await createOrder({ user: me, product, orderNumber: 'LM-261002-0002', createdAt: daysAgo(3), status: 'shipped' });
    await createOrder({ user: other, product, orderNumber: 'LM-261004-0004', createdAt: daysAgo(0) });

    const res = await (await login(app, me)).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.items.map((order) => order.orderNumber)).toEqual([
      'LM-261003-0003',
      'LM-261002-0002',
      'LM-261001-0001',
    ]);
    expect(res.body.data.items[0]).toEqual({
      orderNumber: 'LM-261003-0003',
      status: 'paid',
      createdAt: expect.any(String),
      totalCents: 9695,
      itemCount: 3,
    });
    expect(res.body.data.items[1].status).toBe('shipped');
  });

  it('pages the list', async () => {
    const me = await createUser();
    const product = await createProduct();
    for (let day = 1; day <= 5; day += 1) {
      await createOrder({ user: me, product, orderNumber: `LM-26100${day}-000${day}`, createdAt: daysAgo(day) });
    }
    const agent = await login(app, me);

    const second = await agent.get('/api/orders?page=2&limit=2');
    const last = await agent.get('/api/orders?page=3&limit=2');

    expect(second.body.data).toMatchObject({ page: 2, limit: 2, total: 5 });
    expect(second.body.data.items.map((order) => order.orderNumber)).toEqual(['LM-261003-0003', 'LM-261004-0004']);
    expect(last.body.data.items.map((order) => order.orderNumber)).toEqual(['LM-261005-0005']);
  });

  it.each(['limit=51', 'limit=0', 'page=0', 'page=abc', 'page=10001'])('rejects %s with 400', async (query) => {
    const res = await (await login(app, await createUser())).get(`/api/orders?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/orders/:orderNumber', () => {
  it('needs a signed-in user', async () => {
    const res = await request(app).get('/api/orders/LM-261001-0001');

    expect(res.status).toBe(401);
  });

  it('returns my order with its items', async () => {
    const me = await createUser();
    const product = await createProduct({ slug: 'red-top', title: 'Red Top', priceCents: 2500 });
    await createOrder({ user: me, product, quantity: 2, orderNumber: 'LM-261001-0001' });

    const res = await (await login(app, me)).get('/api/orders/LM-261001-0001');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      orderNumber: 'LM-261001-0001',
      status: 'paid',
      subtotalCents: 5000,
      shippingCents: 695,
      totalCents: 5695,
    });
    expect(res.body.data.items).toEqual([
      {
        productSlug: 'red-top',
        title: 'Red Top',
        color: 'Black',
        size: 'M',
        imageUrl: 'https://cdn.example/main.webp',
        unitPriceCents: 2500,
        quantity: 2,
        lineTotalCents: 5000,
      },
    ]);
    expect(keysIn(res)).not.toContain('"stock"');
  });

  it("answers 404 for another user's order, like one that does not exist", async () => {
    const owner = await createUser();
    const product = await createProduct();
    await createOrder({ user: owner, product, orderNumber: 'LM-261001-0001' });
    const agent = await login(app, await createUser());

    const theirs = await agent.get('/api/orders/LM-261001-0001');
    const missing = await agent.get('/api/orders/LM-261001-9999');

    expect(theirs.status).toBe(404);
    expect(theirs.body.error.code).toBe('NOT_FOUND');
    expect(missing.status).toBe(404);
    expect(theirs.body).toEqual(missing.body);
  });

  it('keeps what was bought when the product changes later', async () => {
    const me = await createUser();
    const product = await createProduct({ title: 'Old Name', priceCents: 3000 });
    await createOrder({ user: me, product, orderNumber: 'LM-261001-0001' });
    await db('products').where({ id: product.id }).update({ title: 'New Name', price_cents: 9900 });

    const res = await (await login(app, me)).get('/api/orders/LM-261001-0001');

    expect(res.body.data.items[0]).toMatchObject({ title: 'Old Name', unitPriceCents: 3000 });
    expect(res.body.data.totalCents).toBe(3695);
  });
});
