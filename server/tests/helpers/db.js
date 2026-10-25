import { db } from '../../src/db/knex.js';

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
        size: v.size,
        stock: v.stock,
        position,
      })),
    );
  }
  return { id, slug: slug ?? `product-${n}`, categoryId };
}
