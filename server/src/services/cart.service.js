import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';
import { buildCart, collapseItems, lineStatus, mergeQuantity } from '../utils/cart.js';

// The status is computed here from the stock, and only the status leaves this file: customers never see
// stock numbers.

function toLine(row, quantity) {
  const unitPriceCents = row.price_cents;
  return {
    variantId: row.id,
    productSlug: row.slug,
    title: row.title,
    color: row.color_name,
    size: row.size,
    imageUrl: row.image_url,
    unitPriceCents,
    quantity,
    lineTotalCents: unitPriceCents * quantity,
    status: lineStatus({ stock: row.stock, isActive: Boolean(row.is_active), quantity }),
  };
}

// Prices a list of `{ variantId, quantity }` from the database. Unknown variants are left out; the rest
// keep the order of the list.
async function priceItems(items) {
  const wanted = collapseItems(items);
  if (wanted.length === 0) return buildCart([]);

  const rows = await db('variants')
    .join('products', 'products.id', 'variants.product_id')
    .leftJoin('product_images', function () {
      this.on('product_images.product_id', 'products.id').andOnVal('product_images.position', '=', 0);
    })
    .whereIn(
      'variants.id',
      wanted.map((item) => item.variantId),
    )
    .select(
      'variants.id',
      'variants.color_name',
      'variants.size',
      'variants.stock',
      'products.slug',
      'products.title',
      'products.price_cents',
      'products.is_active',
      'product_images.url as image_url',
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  const lines = wanted.flatMap(({ variantId, quantity }) => {
    const row = byId.get(variantId);
    return row ? [toLine(row, quantity)] : [];
  });
  return buildCart(lines);
}

export const quoteCart = priceItems;

export async function getCart(userId) {
  const items = await db('cart_items')
    .where({ user_id: userId })
    .orderBy('id')
    .select('variant_id as variantId', 'quantity');
  return priceItems(items);
}

// A hidden product cannot be added. One already in the bag stays there, as `sold_out`.
export async function setItem(userId, variantId, quantity) {
  const variant = await db('variants')
    .join('products', 'products.id', 'variants.product_id')
    .where({ 'variants.id': variantId, 'products.is_active': true })
    .first('variants.id');
  if (!variant) throw new AppError(404, 'Not found', 'NOT_FOUND');

  await db('cart_items')
    .insert({ user_id: userId, variant_id: variantId, quantity })
    .onConflict(['user_id', 'variant_id'])
    .merge(['quantity']);
  return getCart(userId);
}

export async function removeItem(userId, variantId) {
  await db('cart_items').where({ user_id: userId, variant_id: variantId }).delete();
  return getCart(userId);
}

// The guest cart joins the account cart: the larger quantity wins, unknown variants are skipped, sold-out
// ones are kept. Sending the same items again changes nothing.
export async function mergeItems(userId, items) {
  const wanted = collapseItems(items);

  if (wanted.length > 0) {
    const variantIds = wanted.map((item) => item.variantId);
    await db.transaction(async (trx) => {
      const known = new Set(await trx('variants').whereIn('id', variantIds).pluck('id'));
      const current = await trx('cart_items')
        .where({ user_id: userId })
        .whereIn('variant_id', variantIds)
        .select('variant_id', 'quantity');
      const inCart = new Map(current.map((row) => [row.variant_id, row.quantity]));

      const rows = wanted
        .filter((item) => known.has(item.variantId))
        .map((item) => ({
          user_id: userId,
          variant_id: item.variantId,
          quantity: mergeQuantity(inCart.get(item.variantId), item.quantity),
        }));
      if (rows.length > 0) {
        await trx('cart_items').insert(rows).onConflict(['user_id', 'variant_id']).merge(['quantity']);
      }
    });
  }
  return getCart(userId);
}
