import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createOrder, createProduct, createReview, createUser, login } from '../helpers/db.js';

const app = createApp();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

let admin;
beforeEach(async () => {
  await cleanTables();
  admin = await login(app, await createUser({ role: 'admin' }));
});
afterAll(() => db.destroy());

const productRow = (product) => db('products').where({ id: product.id }).first();
const reviewsOf = (product) => db('reviews').where({ product_id: product.id });

// A product the dataset rated 4.0 from 10 reviews.
const ratedProduct = (extra = {}) =>
  createProduct({ ratingAvg: 4.0, reviewCount: 10, seed_rating_avg: 4.0, seed_review_count: 10, ...extra });

describe('GET /api/admin/reviews', () => {
  it('lists every review, with or without a comment, newest first, with the author\'s email and the product', async () => {
    const product = await createProduct({ slug: 'blue-dress', title: 'Blue Dress' });
    const anna = await createUser({ email: 'anna@example.com' });
    const ben = await createUser({ email: 'ben@example.com' });
    await createReview({ user: anna, product, rating: 5, comment: 'Older', createdAt: daysAgo(3) });
    await createReview({ user: ben, product, rating: 2, comment: null, createdAt: daysAgo(1) });

    const res = await admin.get('/api/admin/reviews');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ page: 1, limit: 20, total: 2 });
    expect(res.body.data.items).toEqual([
      {
        id: expect.any(Number),
        rating: 2,
        comment: null,
        createdAt: expect.any(String),
        product: { slug: 'blue-dress', title: 'Blue Dress' },
        user: { email: 'ben@example.com' },
      },
      {
        id: expect.any(Number),
        rating: 5,
        comment: 'Older',
        createdAt: expect.any(String),
        product: { slug: 'blue-dress', title: 'Blue Dress' },
        user: { email: 'anna@example.com' },
      },
    ]);
  });

  it('lists the reviews of a hidden product too', async () => {
    const hidden = await createProduct({ isActive: false });
    await createReview({ user: await createUser(), product: hidden, comment: 'Still here' });

    const res = await admin.get('/api/admin/reviews');

    expect(res.body.data.total).toBe(1);
  });

  it('filters by product', async () => {
    const first = await createProduct();
    const second = await createProduct();
    await createReview({ user: await createUser(), product: first, comment: 'First' });
    await createReview({ user: await createUser(), product: second, comment: 'Second' });

    const res = await admin.get(`/api/admin/reviews?productId=${second.id}`);

    expect(res.body.data.items.map((review) => review.comment)).toEqual(['Second']);
    expect(res.body.data.total).toBe(1);
  });

  it('pages the list', async () => {
    const product = await createProduct();
    for (let day = 1; day <= 5; day += 1) {
      await createReview({ user: await createUser(), product, comment: `Day ${day}`, createdAt: daysAgo(day) });
    }

    const res = await admin.get('/api/admin/reviews?limit=2&page=3');

    expect(res.body.data.items.map((review) => review.comment)).toEqual(['Day 5']);
    expect(res.body.data).toMatchObject({ page: 3, limit: 2, total: 5 });
  });

  it.each(['limit=101', 'limit=0', 'page=0', 'productId=abc', 'productId=0'])('rejects %s with 400', async (query) => {
    const res = await admin.get(`/api/admin/reviews?${query}`);

    expect(res.status).toBe(400);
  });

  it('treats an empty productId as not sent', async () => {
    const product = await createProduct();
    await createReview({ user: await createUser(), product, comment: 'x' });

    const res = await admin.get('/api/admin/reviews?productId=');

    expect(res.body.data.total).toBe(1);
  });
});

describe('DELETE /api/admin/reviews/:id', () => {
  // A real review through the API, so the shown rating includes it.
  async function reviewedBy(product, rating = 1) {
    const user = await createUser();
    await createOrder({ user, product, status: 'delivered' });
    const agent = await login(app, user);
    await agent.put(`/api/products/${product.slug}/reviews/mine`).send({ rating, comment: 'Spam' });
    return (await reviewsOf(product).where({ user_id: user.id }).first()).id;
  }

  it('deletes the review with 204 and gives the shown rating back its dataset values', async () => {
    const product = await ratedProduct();
    const id = await reviewedBy(product, 1);
    expect(await productRow(product)).toMatchObject({ rating_avg: '3.7', review_count: 11 });

    const res = await admin.delete(`/api/admin/reviews/${id}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(await reviewsOf(product)).toEqual([]);
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.0', review_count: 10 });
  });

  it('keeps the other reviews in the shown rating', async () => {
    const product = await ratedProduct();
    const spam = await reviewedBy(product, 1);
    await reviewedBy(product, 5);

    await admin.delete(`/api/admin/reviews/${spam}`);

    expect(await reviewsOf(product)).toHaveLength(1);
    // (4.0 x 10 + 5) / 11 = 4.09
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.1', review_count: 11 });
  });

  it('leaves a product the dataset did not rate with no rating again', async () => {
    const product = await createProduct();
    const id = await reviewedBy(product, 5);

    await admin.delete(`/api/admin/reviews/${id}`);

    expect(await productRow(product)).toMatchObject({ rating_avg: null, review_count: 0 });
  });

  it('works for a review of a hidden product', async () => {
    const product = await ratedProduct();
    const id = await reviewedBy(product, 1);
    await db('products').where({ id: product.id }).update({ is_active: false });

    const res = await admin.delete(`/api/admin/reviews/${id}`);

    expect(res.status).toBe(204);
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.0', review_count: 10 });
  });

  it('lets the customer write a new review afterwards', async () => {
    const product = await ratedProduct();
    const user = await createUser();
    await createOrder({ user, product, status: 'delivered' });
    const agent = await login(app, user);
    await agent.put(`/api/products/${product.slug}/reviews/mine`).send({ rating: 1, comment: 'Spam' });
    const id = (await reviewsOf(product).first()).id;

    await admin.delete(`/api/admin/reviews/${id}`);
    const again = await agent.put(`/api/products/${product.slug}/reviews/mine`).send({ rating: 4 });

    expect(again.status).toBe(200);
  });

  it('answers 404 for an unknown review, and for one already deleted', async () => {
    const product = await ratedProduct();
    const id = await reviewedBy(product);

    const first = await admin.delete(`/api/admin/reviews/${id}`);
    const second = await admin.delete(`/api/admin/reviews/${id}`);
    const unknown = await admin.delete('/api/admin/reviews/999999');

    expect(first.status).toBe(204);
    expect(second.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.0', review_count: 10 });
  });

  it('answers 400 for a bad id', async () => {
    expect((await admin.delete('/api/admin/reviews/abc')).status).toBe(400);
  });

  it('keeps the right numbers when two reviews are deleted at once', async () => {
    const product = await ratedProduct();
    const first = await reviewedBy(product, 1);
    const second = await reviewedBy(product, 1);
    const other = await login(app, await createUser({ role: 'admin' }));

    const [a, b] = await Promise.all([
      admin.delete(`/api/admin/reviews/${first}`),
      other.delete(`/api/admin/reviews/${second}`),
    ]);

    expect([a.status, b.status]).toEqual([204, 204]);
    expect(await productRow(product)).toMatchObject({ rating_avg: '4.0', review_count: 10 });
  });

  it('shows the product page the restored rating', async () => {
    const product = await ratedProduct();
    const id = await reviewedBy(product, 1);

    await admin.delete(`/api/admin/reviews/${id}`);
    const page = await request(app).get(`/api/products/${product.slug}`);

    expect(page.body.data).toMatchObject({ ratingAvg: 4, reviewCount: 10 });
  });
});
