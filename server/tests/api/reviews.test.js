import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createOrder, createProduct, createReview, createUser, login } from '../helpers/db.js';

const app = createApp();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const reviewsOf = (product) => db('reviews').where({ product_id: product.id });
const productRow = (product) => db('products').where({ id: product.id }).first();
const url = (product) => `/api/products/${product.slug}/reviews`;
const mine = (product) => `${url(product)}/mine`;

// A product with a dataset rating of 4.0 from 10 reviews, like the shop shows before anyone reviews it.
const ratedProduct = (extra = {}) =>
  createProduct({ ratingAvg: 4.0, reviewCount: 10, seed_rating_avg: 4.0, seed_review_count: 10, ...extra });

// A signed-in user with a `delivered` order for the product.
async function buyer(product, { status = 'delivered', ...user } = {}) {
  const created = await createUser(user);
  await createOrder({ user: created, product, status });
  return { user: created, agent: await login(app, created) };
}

beforeEach(cleanTables);
afterAll(() => db.destroy());

describe('PUT /api/products/:slug/reviews/mine', () => {
  it('lets a buyer review, and updates the shown rating with the dataset values', async () => {
    const product = await ratedProduct();
    const { user, agent } = await buyer(product);

    const res = await agent.put(mine(product)).send({ rating: 5, comment: 'Lovely dress' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      review: { rating: 5, comment: 'Lovely dress', createdAt: expect.any(String) },
      // (4.0 x 10 + 5) / 11 = 4.09
      ratingAvg: 4.1,
      reviewCount: 11,
    });
    const [row] = await reviewsOf(product);
    expect(row).toMatchObject({ user_id: user.id, rating: 5, comment: 'Lovely dress' });
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.1', review_count: 11 });
  });

  it('shows the first review as the rating of a product the dataset did not rate', async () => {
    const product = await createProduct();
    const { agent } = await buyer(product);

    const res = await agent.put(mine(product)).send({ rating: 4 });

    expect(res.body.data).toMatchObject({ ratingAvg: 4, reviewCount: 1 });
  });

  it('shows the new rating on the product page', async () => {
    const product = await ratedProduct();
    const { agent } = await buyer(product);

    await agent.put(mine(product)).send({ rating: 5 });
    const page = await request(app).get(`/api/products/${product.slug}`);

    expect(page.body.data).toMatchObject({ ratingAvg: 4.1, reviewCount: 11 });
  });

  it.each([
    ['has no order', null],
    ['has only a paid order', 'paid'],
    ['has only a shipped order', 'shipped'],
    ['has only a cancelled order', 'cancelled'],
  ])('answers 403 NOT_PURCHASED for a user who %s', async (_name, status) => {
    const product = await ratedProduct();
    const user = await createUser();
    if (status) await createOrder({ user, product, status });

    const res = await (await login(app, user)).put(mine(product)).send({ rating: 5, comment: 'Nice' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_PURCHASED');
    expect(await reviewsOf(product)).toEqual([]);
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.0', review_count: 10 });
  });

  it("does not count another user's delivered order", async () => {
    const product = await ratedProduct();
    await buyer(product);
    const stranger = await createUser();

    const res = await (await login(app, stranger)).put(mine(product)).send({ rating: 5 });

    expect(res.status).toBe(403);
  });

  it('does not count a delivered order for another product', async () => {
    const product = await ratedProduct();
    const other = await createProduct();
    const user = await createUser();
    await createOrder({ user, product: other, status: 'delivered' });

    const res = await (await login(app, user)).put(mine(product)).send({ rating: 5 });

    expect(res.status).toBe(403);
  });

  it('updates the same review on a second save (one review per user per product)', async () => {
    const product = await ratedProduct();
    const { agent } = await buyer(product);
    await agent.put(mine(product)).send({ rating: 5, comment: 'Great' });

    const res = await agent.put(mine(product)).send({ rating: 1, comment: 'Changed my mind' });

    expect(res.status).toBe(200);
    expect(res.body.data.review).toMatchObject({ rating: 1, comment: 'Changed my mind' });
    // (4.0 x 10 + 1) / 11 = 3.73, and still 11 reviews
    expect(res.body.data).toMatchObject({ ratingAvg: 3.7, reviewCount: 11 });
    expect(await reviewsOf(product)).toHaveLength(1);
  });

  it('checks the purchase again on an update', async () => {
    const product = await ratedProduct();
    const { user, agent } = await buyer(product);
    await agent.put(mine(product)).send({ rating: 5, comment: 'Great' });
    await db('orders').where({ user_id: user.id }).update({ status: 'shipped' });

    const res = await agent.put(mine(product)).send({ rating: 1 });

    expect(res.status).toBe(403);
    expect((await reviewsOf(product))[0]).toMatchObject({ rating: 5, comment: 'Great' });
  });

  it('counts a rating-only review in the average, and saves no comment', async () => {
    const product = await ratedProduct();
    const { agent } = await buyer(product);

    const res = await agent.put(mine(product)).send({ rating: 5 });

    expect(res.body.data.review.comment).toBeNull();
    expect(res.body.data.reviewCount).toBe(11);
    expect((await reviewsOf(product))[0].comment).toBeNull();
  });

  it.each([
    ['null', null],
    ['an empty text', ''],
    ['only spaces', '   \n '],
  ])('saves %s as no comment', async (_name, comment) => {
    const product = await createProduct();
    const { agent } = await buyer(product);

    const res = await agent.put(mine(product)).send({ rating: 3, comment });

    expect(res.status).toBe(200);
    expect(res.body.data.review.comment).toBeNull();
  });

  it('trims the comment', async () => {
    const product = await createProduct();
    const { agent } = await buyer(product);

    const res = await agent.put(mine(product)).send({ rating: 3, comment: '  Runs small  ' });

    expect(res.body.data.review.comment).toBe('Runs small');
  });

  it('accepts a comment of 1000 characters and rejects 1001', async () => {
    const product = await createProduct();
    const { agent } = await buyer(product);

    const ok = await agent.put(mine(product)).send({ rating: 3, comment: 'a'.repeat(1000) });
    const tooLong = await agent.put(mine(product)).send({ rating: 3, comment: 'a'.repeat(1001) });

    expect(ok.status).toBe(200);
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['0', { rating: 0 }],
    ['6', { rating: 6 }],
    ['a fraction', { rating: 1.5 }],
    ['text', { rating: '5' }],
    ['null', { rating: null }],
    ['missing', {}],
    ['a comment that is not text', { rating: 5, comment: 42 }],
  ])('rejects a rating of %s with 400', async (_name, body) => {
    const product = await createProduct();
    const { agent } = await buyer(product);

    const res = await agent.put(mine(product)).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await reviewsOf(product)).toEqual([]);
  });

  it('needs a signed-in user', async () => {
    const product = await createProduct();

    const res = await request(app).put(mine(product)).send({ rating: 5 });

    expect(res.status).toBe(401);
  });

  it('answers 404 for an unknown product and for a hidden one', async () => {
    const hidden = await createProduct({ isActive: false });
    const { agent } = await buyer(hidden);

    const missing = await agent.put('/api/products/no-such-product/reviews/mine').send({ rating: 5 });
    const inactive = await agent.put(mine(hidden)).send({ rating: 5 });

    expect(missing.status).toBe(404);
    expect(inactive.status).toBe(404);
  });

  it('keeps the right count when two buyers review at once', async () => {
    const product = await ratedProduct();
    const anna = await buyer(product);
    const ben = await buyer(product);

    const [a, b] = await Promise.all([
      anna.agent.put(mine(product)).send({ rating: 5 }),
      ben.agent.put(mine(product)).send({ rating: 3 }),
    ]);

    expect([a.status, b.status]).toEqual([200, 200]);
    // (4.0 x 10 + 5 + 3) / 12 = 4.0
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.0', review_count: 12 });
    expect(await reviewsOf(product)).toHaveLength(2);
  });
});

describe('review changes and the product lock', () => {
  it('leaves one review and a matching rating when the same user saves twice at once', async () => {
    const product = await ratedProduct();
    const { agent } = await buyer(product);

    const [a, b] = await Promise.all([
      agent.put(mine(product)).send({ rating: 5, comment: 'First' }),
      agent.put(mine(product)).send({ rating: 1, comment: 'Second' }),
    ]);

    expect([a.status, b.status]).toEqual([200, 200]);
    const rows = await reviewsOf(product);
    expect(rows).toHaveLength(1);
    // The shown rating matches whichever save came last: (40 + 5) / 11 = 4.1 or (40 + 1) / 11 = 3.7.
    expect(await productRow(product)).toMatchObject({
      rating_avg: rows[0].rating === 5 ? '4.1' : '3.7',
      review_count: 11,
    });
  });

  it('keeps the right numbers when a save and a delete of the same review happen at once', async () => {
    const product = await ratedProduct();
    const { agent } = await buyer(product);
    await agent.put(mine(product)).send({ rating: 5, comment: 'Here' });

    await Promise.all([agent.delete(mine(product)), agent.put(mine(product)).send({ rating: 1 })]);

    const rows = await reviewsOf(product);
    const expected = rows.length === 0 ? { rating_avg: '4.0', review_count: 10 } : { rating_avg: '3.7', review_count: 11 };
    expect(await productRow(product)).toMatchObject(expected);
  });
});

describe('DELETE /api/products/:slug/reviews/mine', () => {
  it('removes my review and gives the shown rating back its dataset values', async () => {
    const product = await ratedProduct();
    const { agent } = await buyer(product);
    await agent.put(mine(product)).send({ rating: 1, comment: 'Oops' });

    const res = await agent.delete(mine(product));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ratingAvg: 4, reviewCount: 10 });
    expect(await reviewsOf(product)).toEqual([]);
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.0', review_count: 10 });
  });

  it('leaves a product the dataset did not rate with no rating again', async () => {
    const product = await createProduct();
    const { agent } = await buyer(product);
    await agent.put(mine(product)).send({ rating: 5 });

    const res = await agent.delete(mine(product));

    expect(res.body.data).toEqual({ ratingAvg: null, reviewCount: 0 });
    expect(await productRow(product)).toMatchObject({ rating_avg: null, review_count: 0 });
  });

  it('needs no purchase: a user can always remove their own review', async () => {
    const product = await ratedProduct();
    const { user, agent } = await buyer(product);
    await agent.put(mine(product)).send({ rating: 5, comment: 'Nice' });
    await db('orders').where({ user_id: user.id }).update({ status: 'shipped' });

    const res = await agent.delete(mine(product));

    expect(res.status).toBe(200);
    expect(await reviewsOf(product)).toEqual([]);
  });

  it('answers 200 with the same numbers when there is no review', async () => {
    const product = await ratedProduct();
    const user = await createUser();

    const res = await (await login(app, user)).delete(mine(product));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ ratingAvg: 4, reviewCount: 10 });
  });

  it("never removes another user's review", async () => {
    const product = await ratedProduct();
    const anna = await buyer(product);
    const ben = await buyer(product);
    await anna.agent.put(mine(product)).send({ rating: 5, comment: 'Anna here' });

    await ben.agent.delete(mine(product));

    const rows = await reviewsOf(product);
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(anna.user.id);
  });

  it('needs a signed-in user', async () => {
    const product = await createProduct();

    const res = await request(app).delete(mine(product));

    expect(res.status).toBe(401);
  });

  it('answers 404 for an unknown product', async () => {
    const agent = await login(app, await createUser());

    const res = await agent.delete('/api/products/no-such-product/reviews/mine');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/products/:slug/reviews/mine', () => {
  it('needs a signed-in user', async () => {
    const product = await createProduct();

    const res = await request(app).get(mine(product));

    expect(res.status).toBe(401);
  });

  it('tells a buyer with no review that they can review', async () => {
    const product = await createProduct();
    const { agent } = await buyer(product);

    const res = await agent.get(mine(product));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ review: null, canReview: true });
  });

  it('returns the buyer\'s review', async () => {
    const product = await createProduct();
    const { agent } = await buyer(product);
    await agent.put(mine(product)).send({ rating: 4, comment: 'Good' });

    const res = await agent.get(mine(product));

    expect(res.body.data).toEqual({
      review: { rating: 4, comment: 'Good', createdAt: expect.any(String) },
      canReview: true,
    });
  });

  it.each([null, 'paid', 'shipped', 'cancelled'])('says a user with %s order cannot review', async (status) => {
    const product = await createProduct();
    const user = await createUser();
    if (status) await createOrder({ user, product, status });

    const res = await (await login(app, user)).get(mine(product));

    expect(res.body.data).toEqual({ review: null, canReview: false });
  });

  it('answers 404 for an unknown or hidden product', async () => {
    const hidden = await createProduct({ isActive: false });
    const agent = await login(app, await createUser());

    expect((await agent.get('/api/products/no-such-product/reviews/mine')).status).toBe(404);
    expect((await agent.get(mine(hidden))).status).toBe(404);
  });
});

describe('GET /api/products/:slug/reviews', () => {
  it('needs no sign in and returns an empty page for a product with no reviews', async () => {
    const product = await createProduct();

    const res = await request(app).get(url(product));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ items: [], page: 1, limit: 10, total: 0 });
  });

  it('lists the reviews that have a comment, newest first, with the author as first name and last initial', async () => {
    const product = await createProduct();
    const anna = await createUser({ firstName: 'Anna', lastName: 'Kim' });
    const ben = await createUser({ firstName: 'Ben', lastName: 'ábel' });
    const cara = await createUser();
    await createReview({ user: anna, product, rating: 5, comment: 'Older', createdAt: daysAgo(3) });
    await createReview({ user: ben, product, rating: 2, comment: 'Newer', createdAt: daysAgo(1) });
    await createReview({ user: cara, product, rating: 4, comment: null, createdAt: daysAgo(0) });

    const res = await request(app).get(url(product));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items).toEqual([
      { id: expect.any(Number), rating: 2, comment: 'Newer', authorName: 'Ben á.', createdAt: expect.any(String) },
      { id: expect.any(Number), rating: 5, comment: 'Older', authorName: 'Anna K.', createdAt: expect.any(String) },
    ]);
  });

  it('never shows an email or any other user detail', async () => {
    const product = await createProduct();
    const user = await createUser({ firstName: 'Anna', lastName: 'Kim', email: 'anna.kim@example.com' });
    await createReview({ user, product, comment: 'Nice' });

    const res = await request(app).get(url(product));

    expect(JSON.stringify(res.body)).not.toMatch(/anna\.kim|example\.com|user_id|userId|password/i);
  });

  it("shows only this product's reviews", async () => {
    const product = await createProduct();
    const other = await createProduct();
    const user = await createUser();
    await createReview({ user, product: other, comment: 'Another product' });

    const res = await request(app).get(url(product));

    expect(res.body.data.items).toEqual([]);
  });

  it('pages the list', async () => {
    const product = await createProduct();
    for (let day = 1; day <= 5; day += 1) {
      const user = await createUser();
      await createReview({ user, product, comment: `Review ${day}`, createdAt: daysAgo(day) });
    }

    const second = await request(app).get(`${url(product)}?page=2&limit=2`);
    const last = await request(app).get(`${url(product)}?page=3&limit=2`);

    expect(second.body.data).toMatchObject({ page: 2, limit: 2, total: 5 });
    expect(second.body.data.items.map((r) => r.comment)).toEqual(['Review 3', 'Review 4']);
    expect(last.body.data.items.map((r) => r.comment)).toEqual(['Review 5']);
  });

  it.each(['limit=51', 'limit=0', 'page=0', 'page=abc', 'page=10001'])('rejects %s with 400', async (query) => {
    const product = await createProduct();

    const res = await request(app).get(`${url(product)}?${query}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('answers 404 for an unknown product and for a hidden one', async () => {
    const hidden = await createProduct({ isActive: false });

    expect((await request(app).get('/api/products/no-such-product/reviews')).status).toBe(404);
    expect((await request(app).get(url(hidden))).status).toBe(404);
  });
});
