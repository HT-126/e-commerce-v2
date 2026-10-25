import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createOrder, createProduct, createReview, createUser, login } from '../helpers/db.js';

const app = createApp();

// Every admin route. A new admin route goes here too.
const ROUTES = [
  ['get', '/api/admin/products'],
  ['post', '/api/admin/products'],
  ['get', '/api/admin/products/1'],
  ['patch', '/api/admin/products/1'],
  ['post', '/api/admin/products/1/variants'],
  ['patch', '/api/admin/variants/1'],
  ['get', '/api/admin/orders'],
  ['get', '/api/admin/orders/LM-261025-0001'],
  ['patch', '/api/admin/orders/LM-261025-0001'],
  ['get', '/api/admin/reviews'],
  ['delete', '/api/admin/reviews/1'],
];

beforeEach(cleanTables);
afterAll(() => db.destroy());

describe('every /api/admin route', () => {
  it.each(ROUTES)('%s %s answers 401 when signed out', async (method, path) => {
    const res = await request(app)[method](path).send({});

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it.each(ROUTES)('%s %s answers 403 FORBIDDEN to a customer', async (method, path) => {
    const agent = await login(app, await createUser({ role: 'customer' }));

    const res = await agent[method](path).send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('is guarded as a whole: even a path that does not exist gives a customer 403, not 404', async () => {
    const agent = await login(app, await createUser());

    const res = await agent.get('/api/admin/no-such-thing');

    expect(res.status).toBe(403);
  });

  it('lets an admin through', async () => {
    const agent = await login(app, await createUser({ role: 'admin' }));

    const res = await agent.get('/api/admin/orders');

    expect(res.status).toBe(200);
  });
});

describe('what a customer can change through the admin routes', () => {
  it('is nothing: an order, a product and a review stay as they were', async () => {
    const customer = await createUser();
    const product = await createProduct({ title: 'Original', isActive: true });
    const order = await createOrder({ user: customer, product, status: 'paid' });
    const review = await createReview({ user: customer, product, rating: 4, comment: 'Mine' });
    const agent = await login(app, customer);

    await agent.patch(`/api/admin/orders/${order.orderNumber}`).send({ status: 'shipped' });
    await agent.patch(`/api/admin/products/${product.id}`).send({ title: 'Hacked', isActive: false });
    await agent.patch(`/api/admin/variants/${product.variants[0].id}`).send({ stock: 999 });
    await agent.delete(`/api/admin/reviews/${review.id}`);

    expect((await db('orders').where({ id: order.id }).first()).status).toBe('paid');
    expect(await db('products').where({ id: product.id }).first()).toMatchObject({ title: 'Original', is_active: 1 });
    expect((await db('variants').where({ id: product.variants[0].id }).first()).stock).toBe(10);
    expect(await db('reviews').where({ id: review.id })).toHaveLength(1);
  });
});

describe('the role comes from the database, not from the cookie', () => {
  it('lets a user who was made admin after signing in use the admin routes at once', async () => {
    const user = await createUser({ role: 'customer' });
    const agent = await login(app, user);
    expect((await agent.get('/api/admin/orders')).status).toBe(403);

    await db('users').where({ id: user.id }).update({ role: 'admin' });

    expect((await agent.get('/api/admin/orders')).status).toBe(200);
  });

  it('stops an admin who was demoted after signing in at once', async () => {
    const user = await createUser({ role: 'admin' });
    const agent = await login(app, user);
    expect((await agent.get('/api/admin/orders')).status).toBe(200);

    await db('users').where({ id: user.id }).update({ role: 'customer' });

    expect((await agent.get('/api/admin/orders')).status).toBe(403);
  });

  it('answers 401 once the user is deleted', async () => {
    const user = await createUser({ role: 'admin' });
    const agent = await login(app, user);

    await db('users').where({ id: user.id }).delete();

    expect((await agent.get('/api/admin/orders')).status).toBe(401);
  });
});
