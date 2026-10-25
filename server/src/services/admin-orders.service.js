import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';
import { escapeLike } from '../utils/catalog.js';
import { allowedStatuses } from '../utils/order.js';
import { loadOrder } from './orders.service.js';

const notFound = () => new AppError(404, 'Not found', 'NOT_FOUND');

const ORDERS = {
  newest: [
    { column: 'orders.created_at', order: 'desc' },
    { column: 'orders.id', order: 'desc' },
  ],
  oldest: [
    { column: 'orders.created_at', order: 'asc' },
    { column: 'orders.id', order: 'asc' },
  ],
  total_desc: [
    { column: 'orders.total_cents', order: 'desc' },
    { column: 'orders.id', order: 'desc' },
  ],
};

function applyFilters(query, { status, q }) {
  if (status) query.where('orders.status', status);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    query.where((builder) => builder.where('orders.order_number', 'like', like).orWhere('orders.email', 'like', like));
  }
  return query;
}

export async function listOrders({ sort, page, limit, ...filters }) {
  const [{ total }] = await applyFilters(db('orders'), filters).count({ total: '*' });
  const rows = await applyFilters(db('orders'), filters)
    .select(
      'orders.*',
      db.raw('(SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_items.order_id = orders.id) AS item_count'),
    )
    .orderBy(ORDERS[sort])
    .limit(limit)
    .offset((page - 1) * limit);

  const items = rows.map((row) => ({
    orderNumber: row.order_number,
    status: row.status,
    createdAt: row.created_at,
    email: row.email,
    totalCents: row.total_cents,
    itemCount: Number(row.item_count),
  }));
  return { items, page, limit, total: Number(total) };
}

// The customer's order plus who bought it and which changes are allowed now.
async function loadAdminOrder(conn, row) {
  const order = await loadOrder(conn, row);
  const customer = await conn('users').where({ id: row.user_id }).first('id', 'first_name', 'last_name');
  return {
    ...order,
    email: row.email,
    customer: { id: customer.id, firstName: customer.first_name, lastName: customer.last_name },
    allowedStatuses: allowedStatuses(row.status),
  };
}

export async function getOrder(orderNumber) {
  const row = await db('orders').where({ order_number: orderNumber }).first();
  if (!row) throw notFound();
  return loadAdminOrder(db, row);
}

// A cancelled order gives its stock back. Lowest variant id first, like when the stock was taken. A line
// whose variant was deleted (`variant_id` null) has nothing to give back to.
async function restock(trx, orderId) {
  const items = await trx('order_items')
    .where({ order_id: orderId })
    .whereNotNull('variant_id')
    .orderBy('variant_id')
    .select('variant_id', 'quantity');
  for (const item of items) {
    await trx('variants').where({ id: item.variant_id }).increment('stock', item.quantity);
  }
}

// The order row is locked first, so two requests at once cannot both cancel (and so restock) the same order.
export async function changeStatus(orderNumber, status) {
  return db.transaction(async (trx) => {
    const row = await trx('orders').where({ order_number: orderNumber }).forUpdate().first();
    if (!row) throw notFound();

    if (!allowedStatuses(row.status).includes(status)) {
      throw new AppError(400, `An order that is ${row.status} cannot become ${status}`, 'INVALID_STATUS_CHANGE');
    }
    if (status === 'cancelled') await restock(trx, row.id);
    await trx('orders').where({ id: row.id }).update({ status });

    return loadAdminOrder(trx, { ...row, status });
  });
}
