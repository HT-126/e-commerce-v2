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
