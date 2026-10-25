import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { requireVars } from '../../src/config/env.js';
import { CATEGORIES, categorySlugFor, mapProduct } from '../seed-lib/map-product.js';

// Rules: .claude/knowledge/dataset.md. Runs only on an empty catalog.
const DATA_FILE = path.join(import.meta.dirname, '../data/products.json');
const BATCH = 500;
const FREE_SHIPPING_FROM_CENTS = 9700;
const FLAT_SHIPPING_CENTS = 695;

async function loadSourceProducts() {
  const text = await fs.readFile(DATA_FILE, 'utf8').catch(() => null);
  if (text === null) {
    console.error('db/data/products.json not found. Run `npm run data:download` first.');
    process.exit(1);
  }
  return JSON.parse(text).filter((p) => categorySlugFor(p.category.full_path));
}

// Product with the smallest source id that has an in-stock variant: its first in-stock variant
// gets stock 1, to test the "last item" case.
function pickLastItemVariant(mapped) {
  const candidates = mapped
    .filter((m) => m.variants.some((v) => v.stock > 0))
    .sort((a, b) => (BigInt(a.product.source_id) < BigInt(b.product.source_id) ? -1 : 1));
  const variant = candidates[0].variants.find((v) => v.stock > 0);
  variant.stock = 1;
  return variant.sku;
}

async function insertCatalog(trx, sourceProducts) {
  await trx('categories').insert(CATEGORIES.map((c, i) => ({ name: c.name, slug: c.slug, position: i })));
  const categoryIds = Object.fromEntries(
    (await trx('categories').select('id', 'slug')).map((c) => [c.slug, c.id]),
  );

  const mapped = sourceProducts.map((source) => ({
    ...mapProduct(source),
    categoryId: categoryIds[categorySlugFor(source.category.full_path)],
  }));
  const testSku = pickLastItemVariant(mapped);

  await trx.batchInsert(
    'products',
    mapped.map((m) => ({ ...m.product, category_id: m.categoryId })),
    BATCH,
  );
  const productIds = Object.fromEntries(
    (await trx('products').select('id', 'source_id')).map((p) => [p.source_id, p.id]),
  );

  const withProductId = (m, rows) =>
    rows.map((row) => ({ ...row, product_id: productIds[m.product.source_id] }));
  await trx.batchInsert(
    'product_images',
    mapped.flatMap((m) => withProductId(m, m.images)),
    BATCH,
  );
  await trx.batchInsert(
    'variants',
    mapped.flatMap((m) => withProductId(m, m.variants)),
    BATCH,
  );

  console.log(`Test variant with stock 1 (last item): SKU ${testSku}`);
}

async function insertUsers(trx) {
  const hash = (password) => bcrypt.hash(password, 10);
  await trx('users').insert([
    {
      first_name: 'Demo',
      last_name: 'Customer',
      email: process.env.DEMO_CUSTOMER_EMAIL.trim().toLowerCase(),
      password_hash: await hash(process.env.DEMO_CUSTOMER_PASSWORD),
      role: 'customer',
    },
    {
      first_name: 'Store',
      last_name: 'Admin',
      email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
      password_hash: await hash(process.env.ADMIN_PASSWORD),
      role: 'admin',
    },
  ]);
}

// One delivered order with 2 products, so reviews can be tested right away.
// Stock is not taken from the variants.
async function demoOrderItem(trx, productId) {
  const variant = await trx('variants')
    .where({ product_id: productId, stock: 10 })
    .orderBy('position')
    .first();
  const product = await trx('products').where({ id: productId }).first();
  const image = await trx('product_images').where({ product_id: productId, position: 0 }).first();
  return {
    variant_id: variant.id,
    product_id: productId,
    product_slug: product.slug,
    title: product.title,
    color_name: variant.color_name,
    size: variant.size,
    image_url: image.url,
    unit_price_cents: product.price_cents,
    quantity: 1,
    line_total_cents: product.price_cents,
  };
}

async function insertDemoOrder(trx) {
  const customer = await trx('users').where({ role: 'customer' }).first();
  const rows = await trx('variants')
    .where({ stock: 10 })
    .distinct('product_id')
    .orderBy('product_id')
    .limit(2);
  const items = [];
  for (const { product_id: productId } of rows) items.push(await demoOrderItem(trx, productId));

  const subtotal = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  const shipping = subtotal >= FREE_SHIPPING_FROM_CENTS ? 0 : FLAT_SHIPPING_CENTS;
  const today = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  const [orderId] = await trx('orders').insert({
    order_number: `LM-${today}-${suffix}`,
    user_id: customer.id,
    status: 'delivered',
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    total_cents: subtotal + shipping,
    email: customer.email,
  });
  await trx('order_items').insert(items.map((item) => ({ ...item, order_id: orderId })));
}

async function printCounts(knex) {
  const count = async (query) => Number((await query.count({ n: '*' }).first()).n);
  console.log('Seed done:');
  console.log(`  ${await count(knex('categories'))} categories`);
  console.log(
    `  ${await count(knex('products'))} products (${await count(knex('products').whereNotNull('size_chart'))} with a size chart)`,
  );
  console.log(`  ${await count(knex('variants'))} variants`);
  console.log(`  ${await count(knex('users'))} users`);
  console.log(`  ${await count(knex('orders'))} order`);
}

export async function seed(knex) {
  const [{ n }] = await knex('products').count({ n: '*' });
  if (Number(n) > 0) {
    console.log('Seed skipped: database not empty');
    return;
  }

  requireVars(['DEMO_CUSTOMER_EMAIL', 'DEMO_CUSTOMER_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']);
  const sourceProducts = await loadSourceProducts();

  await knex.transaction(async (trx) => {
    await insertCatalog(trx, sourceProducts);
    await insertUsers(trx);
    await insertDemoOrder(trx);
  });
  await printCounts(knex);
}
