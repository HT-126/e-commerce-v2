import bcrypt from 'bcrypt';
import request from 'supertest';
import { db } from '../../src/db/knex.js';
import { colorGroupFor } from '../../src/utils/color-groups.js';

// Children first, so foreign keys never block the delete.
const TABLES = [
  'reviews',
  'order_items',
  'orders',
  'cart_items',
  'variants',
  'product_images',
  'products',
  'categories',
  'users',
];

export async function cleanTables() {
  for (const table of TABLES) await db(table).delete();
}

let counter = 0;
const next = () => ++counter;

export async function createCategory({ name, slug, position } = {}) {
  const n = next();
  const row = { name: name ?? `Category ${n}`, slug: slug ?? `category-${n}`, position: position ?? n };
  const [id] = await db('categories').insert(row);
  return { id, ...row };
}

// `variants`: [{ color, size, stock }]. `images`: [{ url, alt }] (first one is position 0).
export async function createProduct({
  category,
  title,
  slug,
  priceCents = 3000,
  isActive = true,
  ratingAvg = null,
  reviewCount = 0,
  createdAt = new Date(),
  images = [{ url: 'https://cdn.example/main.webp', alt: 'Main photo' }],
  variants = [{ color: 'Black', size: 'M', stock: 10 }],
  ...extra
} = {}) {
  const n = next();
  const categoryId = category?.id ?? (await createCategory()).id;
  const [id] = await db('products').insert({
    slug: slug ?? `product-${n}`,
    title: title ?? `Product ${n}`,
    category_id: categoryId,
    price_cents: priceCents,
    is_active: isActive,
    rating_avg: ratingAvg,
    review_count: reviewCount,
    created_at: createdAt,
    ...extra,
  });

  if (images.length > 0) {
    await db('product_images').insert(
      images.map((image, position) => ({ product_id: id, position, width: 800, height: 1000, ...image })),
    );
  }
  if (variants.length > 0) {
    await db('variants').insert(
      variants.map((v, position) => ({
        product_id: id,
        sku: `SKU-${n}-${position}`,
        color_name: v.color,
        color_group: v.colorGroup ?? colorGroupFor(v.color),
        size: v.size,
        stock: v.stock,
        position,
      })),
    );
  }
  // `variants` has the new ids, in the order they were given.
  const created = await db('variants').where({ product_id: id }).orderBy('position').select('id');
  return {
    id,
    slug: slug ?? `product-${n}`,
    categoryId,
    variants: created.map((row) => ({ id: row.id })),
  };
}

export async function createCartItem({ user, variantId, quantity = 1 }) {
  await db('cart_items').insert({ user_id: user.id, variant_id: variantId, quantity });
}

// A user in the database. The password is hashed with a low cost: tests make many users, and the
// strength of the hash is not what they check.
export async function createUser({
  firstName = 'Test',
  lastName = 'User',
  email,
  password = 'password123',
  role = 'customer',
} = {}) {
  const address = (email ?? `user${next()}@example.com`).toLowerCase();
  const [id] = await db('users').insert({
    first_name: firstName,
    last_name: lastName,
    email: address,
    password_hash: await bcrypt.hash(password, 4),
    role,
  });
  return { id, email: address, password, role };
}

// A Supertest agent that keeps the session cookie: it is signed in as this user.
export async function login(app, user, { remember = false } = {}) {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password, remember });
  if (res.status !== 200) throw new Error(`login helper failed: ${res.status} ${res.text}`);
  return agent;
}

// An order in the database with one line for `product` (the result of `createProduct`), for a test that
// reads orders. It does not touch the stock or the cart.
export async function createOrder({
  user,
  product,
  quantity = 1,
  status = 'paid',
  createdAt = new Date(),
  orderNumber,
} = {}) {
  const n = next();
  const row = await db('products').where({ id: product.id }).first();
  const variant = await db('variants').where({ product_id: product.id }).orderBy('position').first();
  const image = await db('product_images').where({ product_id: product.id, position: 0 }).first();
  const subtotal = row.price_cents * quantity;
  const shipping = subtotal >= 9700 ? 0 : 695;
  const number = orderNumber ?? `LM-261025-${String(n).padStart(4, '0')}`;

  const [id] = await db('orders').insert({
    order_number: number,
    user_id: user.id,
    status,
    subtotal_cents: subtotal,
    shipping_cents: shipping,
    total_cents: subtotal + shipping,
    email: user.email,
    created_at: createdAt,
  });
  await db('order_items').insert({
    order_id: id,
    variant_id: variant.id,
    product_id: product.id,
    product_slug: row.slug,
    title: row.title,
    color_name: variant.color_name,
    size: variant.size,
    image_url: image.url,
    unit_price_cents: row.price_cents,
    quantity,
    line_total_cents: subtotal,
  });
  return { id, orderNumber: number };
}

// A review in the database. It does not change the product's shown rating, so a test that needs the
// numbers right goes through the API.
export async function createReview({ user, product, rating = 5, comment = null, createdAt = new Date() } = {}) {
  const [id] = await db('reviews').insert({
    product_id: product.id,
    user_id: user.id,
    rating,
    comment,
    created_at: createdAt,
  });
  return { id };
}
