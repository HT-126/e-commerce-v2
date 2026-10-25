import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';
import { lockProductById, recomputeRating } from './reviews.service.js';

const notFound = () => new AppError(404, 'Not found', 'NOT_FOUND');

// Every review, with or without a comment, newest first. The admin sees the author's email.
export async function listReviews({ productId, page, limit }) {
  const filtered = () => {
    const query = db('reviews');
    if (productId) query.where('reviews.product_id', productId);
    return query;
  };

  const [{ total }] = await filtered().count({ total: '*' });
  const rows = await filtered()
    .join('products', 'products.id', 'reviews.product_id')
    .join('users', 'users.id', 'reviews.user_id')
    .orderBy([
      { column: 'reviews.created_at', order: 'desc' },
      { column: 'reviews.id', order: 'desc' },
    ])
    .limit(limit)
    .offset((page - 1) * limit)
    .select(
      'reviews.id',
      'reviews.rating',
      'reviews.comment',
      'reviews.created_at',
      'products.slug as product_slug',
      'products.title as product_title',
      'users.email as user_email',
    );

  const items = rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    product: { slug: row.product_slug, title: row.product_title },
    user: { email: row.user_email },
  }));
  return { items, page, limit, total: Number(total) };
}

// For spam. The product is locked first and its shown rating recomputed in the same transaction, as for
// the customer's own delete. Works for a hidden product too.
export async function deleteReview(id) {
  const review = await db('reviews').where({ id }).first('product_id');
  if (!review) throw notFound();

  await db.transaction(async (trx) => {
    await lockProductById(trx, review.product_id);
    const deleted = await trx('reviews').where({ id }).delete();
    if (deleted === 0) throw notFound();
    await recomputeRating(trx, review.product_id);
  });
}
