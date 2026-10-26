import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createOrder, createProduct, createUser, login } from '../helpers/db.js';

const app = createApp();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const STATUSES = ['paid', 'shipped', 'delivered', 'cancelled'];
const ALLOWED = { paid: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };

const statusOf = async (order) => (await db('orders').where({ id: order.id }).first()).status;
const stockOf = async (variantId) => (await db('variants').where({ id: variantId }).first()).stock;

let admin;
beforeEach(async () => {
  await cleanTables();
  admin = await login(app, await createUser({ role: 'admin' }));
});
afterAll(() => db.destroy());

// A customer's order with one line of `quantity` units of a product that has `stock` units left.
async function placed({ status = 'paid', quantity = 2, stock = 5, ...order } = {}) {
  const customer = await createUser({ firstName: 'Anna', lastName: 'Kim' });
  const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock }] });
  const created = await createOrder({ user: customer, product, status, quantity, ...order });
  return { customer, product, variantId: product.variants[0].id, ...created };
}

describe('PATCH /api/admin/orders/:orderNumber', () => {
  it.each([
    ['paid', 'shipped', ['delivered']],
    ['shipped', 'delivered', []],
    ['paid', 'cancelled', []],
  ])('moves a %s order to %s', async (from, to, next) => {
    const order = await placed({ status: from });

    const res = await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: to });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(to);
    expect(res.body.data.allowedStatuses).toEqual(next);
    expect(await statusOf(order)).toBe(to);
  });

  // Every pair that is not in the rules, including "to the same status".
  const forbidden = STATUSES.flatMap((from) =>
    STATUSES.filter((to) => !ALLOWED[from].includes(to)).map((to) => [from, to]),
  );
  it.each(forbidden)('refuses %s to %s with 400 INVALID_STATUS_CHANGE', async (from, to) => {
    const order = await placed({ status: from });

    const res = await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: to });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS_CHANGE');
    expect(await statusOf(order)).toBe(from);
    expect(await stockOf(order.variantId)).toBe(5);
  });

  it('gives the stock of a cancelled order back', async () => {
    const order = await placed({ quantity: 2, stock: 5 });

    await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'cancelled' });

    expect(await stockOf(order.variantId)).toBe(7);
  });

  it('gives back every line of a cancelled order, and only those', async () => {
    const order = await placed({ quantity: 2, stock: 5 });
    const other = await createProduct({ variants: [{ color: 'Red', size: 'S', stock: 4 }] });
    const untouched = await createProduct({ variants: [{ color: 'Blue', size: 'L', stock: 9 }] });
    await db('order_items').insert({
      order_id: order.id,
      variant_id: other.variants[0].id,
      product_id: other.id,
      product_slug: other.slug,
      title: 'Second line',
      color_name: 'Red',
      size: 'S',
      image_url: 'https://cdn.example/x.webp',
      unit_price_cents: 3000,
      quantity: 3,
      line_total_cents: 9000,
    });

    await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'cancelled' });

    expect(await stockOf(order.variantId)).toBe(7);
    expect(await stockOf(other.variants[0].id)).toBe(7);
    expect(await stockOf(untouched.variants[0].id)).toBe(9);
  });

  it('does not touch the stock when an order is shipped or delivered', async () => {
    const order = await placed({ quantity: 2, stock: 5 });

    await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'shipped' });
    await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'delivered' });

    expect(await stockOf(order.variantId)).toBe(5);
  });

  it('gives the stock back only once when the order is cancelled twice', async () => {
    const order = await placed({ quantity: 2, stock: 5 });

    const first = await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'cancelled' });
    const second = await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'cancelled' });

    expect([first.status, second.status]).toEqual([200, 400]);
    expect(await stockOf(order.variantId)).toBe(7);
  });

  it('gives the stock back only once when two cancels arrive at once', async () => {
    const order = await placed({ quantity: 2, stock: 5 });
    const other = await login(app, await createUser({ role: 'admin' }));

    const [a, b] = await Promise.all([
      admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'cancelled' }),
      other.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'cancelled' }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect(await stockOf(order.variantId)).toBe(7);
  });

  it('cancels an order whose product variant was deleted since (nothing to give back to)', async () => {
    const order = await placed({ quantity: 2, stock: 5 });
    await db('variants').where({ id: order.variantId }).delete();

    const res = await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(await statusOf(order)).toBe('cancelled');
  });

  it('answers 404 for an unknown order', async () => {
    const res = await admin.patch('/api/admin/orders/LM-000000-0000').send({ status: 'shipped' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it.each([{ status: 'refunded' }, { status: 5 }, {}])('rejects the body %j with 400', async (body) => {
    const order = await placed();

    const res = await admin.patch(`/api/admin/orders/${order.orderNumber}`).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lets the customer review once the order is delivered', async () => {
    const order = await placed({ status: 'paid' });
    const customer = await login(app, order.customer);
    const slug = order.product.slug;
    expect((await customer.put(`/api/products/${slug}/reviews/mine`).send({ rating: 5 })).status).toBe(403);

    await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'shipped' });
    expect((await customer.put(`/api/products/${slug}/reviews/mine`).send({ rating: 5 })).status).toBe(403);
    await admin.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'delivered' });

    expect((await customer.put(`/api/products/${slug}/reviews/mine`).send({ rating: 5 })).status).toBe(200);
  });
});

describe('GET /api/admin/orders/:orderNumber', () => {
  it('returns the order with the customer, the email and the allowed changes', async () => {
    const order = await placed({ status: 'paid', quantity: 2 });

    const res = await admin.get(`/api/admin/orders/${order.orderNumber}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      orderNumber: order.orderNumber,
      status: 'paid',
      email: order.customer.email,
      customer: { id: order.customer.id, firstName: 'Anna', lastName: 'Kim' },
      allowedStatuses: ['shipped', 'cancelled'],
      subtotalCents: 6000,
    });
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({ quantity: 2, unitPriceCents: 3000 });
  });

  it('does not show a stock number in the order', async () => {
    const order = await placed();

    const res = await admin.get(`/api/admin/orders/${order.orderNumber}`);

    expect(JSON.stringify(res.body)).not.toContain('"stock"');
  });

  it('answers 404 for an unknown order', async () => {
    const res = await admin.get('/api/admin/orders/LM-000000-0000');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/admin/orders', () => {
  async function threeOrders() {
    const anna = await createUser({ email: 'anna@example.com' });
    const ben = await createUser({ email: 'ben@example.com' });
    const product = await createProduct({ priceCents: 2000 });
    await createOrder({ user: anna, product, orderNumber: 'LM-261001-0001', createdAt: daysAgo(5), status: 'paid' });
    await createOrder({
      user: ben,
      product,
      quantity: 4,
      orderNumber: 'LM-261002-0002',
      createdAt: daysAgo(3),
      status: 'shipped',
    });
    await createOrder({ user: anna, product, orderNumber: 'LM-261003-0003', createdAt: daysAgo(1), status: 'paid' });
  }
  const numbers = (res) => res.body.data.items.map((order) => order.orderNumber);

  it('lists every customer\'s orders, newest first, with email, total and units', async () => {
    await threeOrders();

    const res = await admin.get('/api/admin/orders');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, limit: 20, total: 3 });
    expect(numbers(res)).toEqual(['LM-261003-0003', 'LM-261002-0002', 'LM-261001-0001']);
    expect(res.body.data.items[1]).toEqual({
      orderNumber: 'LM-261002-0002',
      status: 'shipped',
      createdAt: expect.any(String),
      email: 'ben@example.com',
      totalCents: 8695,
      itemCount: 4,
    });
  });

  it('sorts oldest first and by the biggest total', async () => {
    await threeOrders();

    expect(numbers(await admin.get('/api/admin/orders?sort=oldest'))).toEqual([
      'LM-261001-0001',
      'LM-261002-0002',
      'LM-261003-0003',
    ]);
    expect(numbers(await admin.get('/api/admin/orders?sort=total_desc'))[0]).toBe('LM-261002-0002');
  });

  it('filters by status', async () => {
    await threeOrders();

    const res = await admin.get('/api/admin/orders?status=shipped');

    expect(numbers(res)).toEqual(['LM-261002-0002']);
    expect(res.body.data.total).toBe(1);
  });

  it('searches by order number or by email', async () => {
    await threeOrders();

    expect(numbers(await admin.get('/api/admin/orders?q=261002'))).toEqual(['LM-261002-0002']);
    expect(numbers(await admin.get('/api/admin/orders?q=anna@'))).toEqual(['LM-261003-0003', 'LM-261001-0001']);
    expect(numbers(await admin.get('/api/admin/orders?q=nobody'))).toEqual([]);
  });

  it('treats % and _ in the search as plain text', async () => {
    await threeOrders();

    expect(numbers(await admin.get('/api/admin/orders?q=%25'))).toEqual([]);
  });

  it('combines status, search and paging', async () => {
    await threeOrders();

    const res = await admin.get('/api/admin/orders?status=paid&q=anna&limit=1&page=2');

    expect(numbers(res)).toEqual(['LM-261001-0001']);
    expect(res.body.data).toMatchObject({ page: 2, limit: 1, total: 2 });
  });

  it.each(['limit=101', 'limit=0', 'page=0', 'status=refunded', 'sort=random'])('rejects %s with 400', async (query) => {
    const res = await admin.get(`/api/admin/orders?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('treats an empty filter as not sent', async () => {
    await threeOrders();

    const res = await admin.get('/api/admin/orders?status=&q=');

    expect(res.body.data.total).toBe(3);
  });
});
