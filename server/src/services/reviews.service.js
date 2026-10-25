import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';
import { computeRating } from '../utils/rating.js';

const notFound = () => new AppError(404, 'Not found', 'NOT_FOUND');

const toReview = (row) => ({ rating: row.rating, comment: row.comment, createdAt: row.created_at });

// "Anna K.": the first name and the first letter of the last name.
const authorName = (row) => `${row.first_name} ${Array.from(row.last_name)[0]}.`;

// Reviews of a hidden product are as gone as the product page itself.
async function findActiveProductId(slug) {
  const product = await db('products').where({ slug, is_active: true }).first('id');
  if (!product) throw notFound();
  return product.id;
}

// "Bought" means an order of this user for this product that is `delivered`. Orders that are `paid`,
// `shipped` or `cancelled` do not count. Checked on the server on every create and update.
async function hasDeliveredOrder(conn, userId, productId) {
  const row = await conn('order_items')
    .join('orders', 'orders.id', 'order_items.order_id')
    .where({ 'orders.user_id': userId, 'orders.status': 'delivered', 'order_items.product_id': productId })
    .first('order_items.id');
  return Boolean(row);
}

// Works out the shown rating and count from the dataset values and the real reviews, and saves them.
// Call it inside the transaction that changed a review, after `lockProduct`, so two changes to one
// product at once cannot overwrite each other. The admin's "delete review" uses it too.
export async function recomputeRating(trx, productId) {
  const product = await trx('products').where({ id: productId }).first('seed_rating_avg', 'seed_review_count');
  const [totals] = await trx('reviews')
    .where({ product_id: productId })
    .select(trx.raw('COUNT(*) AS review_count'), trx.raw('COALESCE(SUM(rating), 0) AS review_sum'));

  const result = computeRating({
    seedAvg: product.seed_rating_avg,
    seedCount: product.seed_review_count,
    reviewSum: Number(totals.review_sum),
    reviewCount: Number(totals.review_count),
  });
  await trx('products')
    .where({ id: productId })
    .update({ rating_avg: result.ratingAvg, review_count: result.reviewCount });
  return result;
}

// The first thing a review change does. The row lock makes the next change to this product wait, and its
// reads (made after the lock) then see this change.
export async function lockProduct(trx, slug) {
  const product = await trx('products').where({ slug, is_active: true }).first('id').forUpdate();
  if (!product) throw notFound();
  return product.id;
}

// Only reviews with a comment are listed. Rating-only reviews count in the average, not here.
export async function listReviews(slug, { page, limit }) {
  const productId = await findActiveProductId(slug);
  const commented = () => db('reviews').where({ 'reviews.product_id': productId }).whereNotNull('reviews.comment');

  const [{ total }] = await commented().count({ total: '*' });
  // The id is the last tie-break, so paging never shows a review twice.
  const rows = await commented()
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
      'users.first_name',
      'users.last_name',
    );

  const items = rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    authorName: authorName(row),
    createdAt: row.created_at,
  }));
  return { items, page, limit, total: Number(total) };
}

export async function getMyReview(userId, slug) {
  const productId = await findActiveProductId(slug);
  const row = await db('reviews').where({ product_id: productId, user_id: userId }).first();
  return { review: row ? toReview(row) : null, canReview: await hasDeliveredOrder(db, userId, productId) };
}

// Creates or updates the user's one review of this product, and the shown rating, in one transaction.
export async function saveReview(userId, slug, { rating, comment }) {
  return db.transaction(async (trx) => {
    const productId = await lockProduct(trx, slug);
    if (!(await hasDeliveredOrder(trx, userId, productId))) {
      throw new AppError(403, 'Only customers who bought this item can review it', 'NOT_PURCHASED');
    }

    await trx('reviews')
      .insert({ product_id: productId, user_id: userId, rating, comment })
      .onConflict(['product_id', 'user_id'])
      .merge(['rating', 'comment']);
    const { ratingAvg, reviewCount } = await recomputeRating(trx, productId);
    const row = await trx('reviews').where({ product_id: productId, user_id: userId }).first();
    return { review: toReview(row), ratingAvg, reviewCount };
  });
}

// A user can always remove their own review, so this needs no purchase. Without a review nothing changes.
export async function deleteReview(userId, slug) {
  return db.transaction(async (trx) => {
    const productId = await lockProduct(trx, slug);
    await trx('reviews').where({ product_id: productId, user_id: userId }).delete();
    return recomputeRating(trx, productId);
  });
}
