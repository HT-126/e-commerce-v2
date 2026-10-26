import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';
import { buildOrderNumber, sortByVariant } from '../utils/order.js';
import { priceItems } from './cart.service.js';

// Orders are a copy of what was bought. Stock numbers never leave this file.

const MAX_NUMBER_TRIES = 5;

const notFound = () => new AppError(404, 'Not found', 'NOT_FOUND');

function toItem(row) {
  return {
    productSlug: row.product_slug,
    title: row.title,
    color: row.color_name,
    size: row.size,
    imageUrl: row.image_url,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    lineTotalCents: row.line_total_cents,
  };
}

// The order as the API returns it: read from the copy in `order_items`, never from the live product.
export async function loadOrder(conn, row) {
  const items = await conn('order_items').where({ order_id: row.id }).orderBy('id');
  return {
    orderNumber: row.order_number,
    status: row.status,
    createdAt: row.created_at,
    items: items.map(toItem),
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
  };
}

// Takes the stock of every line, lowest variant id first. Each update is conditional, so two buyers of the
// last item cannot both win: the database lets one update succeed. Every short line is collected before
// the error is thrown, so the buyer is told about all of them. The throw rolls the transaction back.
async function takeStock(trx, lines) {
  const short = [];
  for (const line of sortByVariant(lines)) {
    const changed = await trx('variants')
      .where({ id: line.variantId })
      .andWhere('stock', '>=', line.quantity)
      .decrement('stock', line.quantity);
    if (changed === 0) {
      short.push({ variantId: line.variantId, title: line.title, color: line.color, size: line.size });
    }
  }
  if (short.length > 0) {
    throw new AppError(
      409,
      'Some items are no longer available in this quantity. Nothing was charged.',
      'STOCK_CHANGED',
      short,
    );
  }
}

// The order number is random, so on the rare duplicate the unique key makes us draw another one.
async function insertOrder(trx, user, cart) {
  for (let attempt = 0; attempt < MAX_NUMBER_TRIES; attempt += 1) {
    try {
      const [id] = await trx('orders').insert({
        order_number: buildOrderNumber(new Date()),
        user_id: user.id,
        status: 'paid',
        subtotal_cents: cart.subtotalCents,
        shipping_cents: cart.shippingCents,
        total_cents: cart.totalCents,
        email: user.email,
      });
      return id;
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
  }
  throw new Error('Could not find a free order number');
}

async function insertItems(trx, orderId, lines) {
  const variants = await trx('variants')
    .whereIn(
      'id',
      lines.map((line) => line.variantId),
    )
    .select('id', 'product_id');
  const productIds = new Map(variants.map((variant) => [variant.id, variant.product_id]));

  await trx('order_items').insert(
    lines.map((line) => ({
      order_id: orderId,
      variant_id: line.variantId,
      product_id: productIds.get(line.variantId),
      product_slug: line.productSlug,
      title: line.title,
      color_name: line.color,
      size: line.size,
      image_url: line.imageUrl ?? '',
      unit_price_cents: line.unitPriceCents,
      quantity: line.quantity,
      line_total_cents: line.lineTotalCents,
    })),
  );
}

// "Pay": one transaction from the bag to a paid order. The mock payment always succeeds.
export async function placeOrder(user) {
  return db.transaction(async (trx) => {
    // Locking the cart rows first makes a second Pay from the same user wait here, and then find the
    // cart empty, instead of making a second order from the same bag.
    const items = await trx('cart_items')
      .where({ user_id: user.id })
      .orderBy('id')
      .select('variant_id as variantId', 'quantity')
      .forUpdate();
    const cart = await priceItems(items, trx);

    if (cart.lines.length === 0) throw new AppError(400, 'Your bag is empty', 'CART_EMPTY');
    if (!cart.canCheckout) {
      throw new AppError(400, 'Some items in your bag cannot be bought right now', 'CART_NOT_READY');
    }

    await takeStock(trx, cart.lines);
    const orderId = await insertOrder(trx, user, cart);
    await insertItems(trx, orderId, cart.lines);
    await trx('cart_items').where({ user_id: user.id }).delete();

    return loadOrder(trx, await trx('orders').where({ id: orderId }).first());
  });
}

export async function listOrders(userId, { page, limit }) {
  const [{ total }] = await db('orders').where({ user_id: userId }).count({ total: '*' });
  // The id is the last tie-break, so paging never shows an order twice.
  const rows = await db('orders')
    .where({ user_id: userId })
    .orderBy([
      { column: 'created_at', order: 'desc' },
      { column: 'id', order: 'desc' },
    ])
    .limit(limit)
    .offset((page - 1) * limit);

  const units = await db('order_items')
    .whereIn(
      'order_id',
      rows.map((row) => row.id),
    )
    .groupBy('order_id')
    .select('order_id')
    .sum({ units: 'quantity' });
  const unitsByOrder = new Map(units.map((row) => [row.order_id, Number(row.units)]));

  const items = rows.map((row) => ({
    orderNumber: row.order_number,
    status: row.status,
    createdAt: row.created_at,
    totalCents: row.total_cents,
    itemCount: unitsByOrder.get(row.id) ?? 0,
  }));
  return { items, page, limit, total: Number(total) };
}

// Another user's order looks the same as one that does not exist.
export async function getOrder(userId, orderNumber) {
  const row = await db('orders').where({ order_number: orderNumber, user_id: userId }).first();
  if (!row) throw notFound();
  return loadOrder(db, row);
}
