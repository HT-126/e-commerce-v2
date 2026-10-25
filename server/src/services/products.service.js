import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';
import { escapeLike, productOrder, variantOptions } from '../utils/catalog.js';

// Stock numbers never leave this file: customers only learn "sold out or not".

const notFound = () => new AppError(404, 'Not found', 'NOT_FOUND');
const toRating = (value) => (value === null ? null : Number(value));

function toCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    priceCents: row.price_cents,
    ratingAvg: toRating(row.rating_avg),
    reviewCount: row.review_count,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    soldOut: Boolean(row.sold_out),
  };
}

// Customers only ever see active products, so every query starts from here.
const activeProducts = () => db('products').where('products.is_active', true);

// Product cards with the main photo (position 0) and a sold-out flag.
function cardQuery() {
  return activeProducts()
    .leftJoin('product_images', function () {
      this.on('product_images.product_id', 'products.id').andOnVal('product_images.position', '=', 0);
    })
    .select(
      'products.id',
      'products.slug',
      'products.title',
      'products.price_cents',
      'products.rating_avg',
      'products.review_count',
      'product_images.url as image_url',
      'product_images.alt as image_alt',
      db.raw(
        'NOT EXISTS (SELECT 1 FROM variants WHERE variants.product_id = products.id AND variants.stock > 0) AS sold_out',
      ),
    );
}

// Color and size must match the same in-stock variant ("black AND M" is one black M you can buy).
function applyVariantFilters(query, { color, size }) {
  const hasColor = color?.length > 0;
  const hasSize = size?.length > 0;
  if (!hasColor && !hasSize) return;

  query.whereExists(function () {
    this.select(db.raw('1'))
      .from('variants')
      .whereRaw('variants.product_id = products.id')
      .where('variants.stock', '>', 0);
    if (hasColor) this.whereIn('variants.color_group', color);
    if (hasSize) this.whereIn('variants.size', size);
  });
}

function applyFilters(query, { category, minPriceCents, maxPriceCents, q, color, size }) {
  if (category) {
    query.whereIn('products.category_id', db('categories').select('id').where({ slug: category }));
  }
  if (minPriceCents !== undefined) query.where('products.price_cents', '>=', minPriceCents);
  if (maxPriceCents !== undefined) query.where('products.price_cents', '<=', maxPriceCents);
  if (q) query.where('products.title', 'like', `%${escapeLike(q)}%`);
  applyVariantFilters(query, { color, size });
  return query;
}

export async function listProducts({ sort, page, limit, ...filters }) {
  const [{ total }] = await applyFilters(activeProducts(), filters).count({ total: '*' });
  const rows = await applyFilters(cardQuery(), filters)
    .orderBy(productOrder(sort))
    .limit(limit)
    .offset((page - 1) * limit);

  return { items: rows.map(toCard), page, limit, total: Number(total) };
}

async function findActiveProduct(slug) {
  const product = await db('products')
    .join('categories', 'categories.id', 'products.category_id')
    .where({ 'products.slug': slug, 'products.is_active': true })
    .first(
      'products.*',
      'categories.id as category_id',
      'categories.name as category_name',
      'categories.slug as category_slug',
    );
  if (!product) throw notFound();
  return product;
}

export async function getProduct(slug) {
  const product = await findActiveProduct(slug);
  const images = await db('product_images')
    .where({ product_id: product.id })
    .orderBy('position')
    .select('url', 'alt', 'width', 'height');
  const rows = await db('variants')
    .where({ product_id: product.id })
    .orderBy('position')
    .select('id', 'color_name', 'size', 'stock');
  const variants = rows.map((v) => ({ id: v.id, color: v.color_name, size: v.size, inStock: v.stock > 0 }));

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    category: { name: product.category_name, slug: product.category_slug },
    priceCents: product.price_cents,
    ratingAvg: toRating(product.rating_avg),
    reviewCount: product.review_count,
    material: product.material,
    care: product.care,
    fit: product.fit,
    length: product.length,
    closure: product.closure,
    season: product.season,
    pattern: product.pattern,
    sizingNotes: product.sizing_notes,
    highlights: product.highlights ?? [],
    stylingNote: product.styling_note,
    sizeChart: product.size_chart,
    images,
    ...variantOptions(variants),
    variants,
  };
}

export async function listRelated(slug) {
  const product = await findActiveProduct(slug);
  const rows = await cardQuery()
    .where('products.category_id', product.category_id)
    .whereNot('products.id', product.id)
    .orderBy(productOrder('newest'))
    .limit(4);
  return rows.map(toCard);
}
