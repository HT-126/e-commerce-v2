import { db } from '../db/knex.js';
import { AppError } from '../utils/app-error.js';
import { escapeLike } from '../utils/catalog.js';
import { colorGroupFor } from '../utils/color-groups.js';

// The admin sees every product, hidden ones too, and the stock numbers.

const notFound = () => new AppError(404, 'Not found', 'NOT_FOUND');
const toRating = (value) => (value === null ? null : Number(value));

const toVariant = (row) => ({
  id: row.id,
  sku: row.sku,
  color: row.color_name,
  size: row.size,
  position: row.position,
  stock: row.stock,
});

// The product with its images and variants, read through `conn` so a transaction sees its own changes.
async function loadProduct(conn, id) {
  const row = await conn('products')
    .join('categories', 'categories.id', 'products.category_id')
    .where('products.id', id)
    .first('products.*', 'categories.name as category_name', 'categories.slug as category_slug');
  if (!row) return null;

  const images = await conn('product_images').where({ product_id: id }).orderBy('position').select('url', 'alt');
  const variants = await conn('variants').where({ product_id: id }).orderBy([{ column: 'position' }, { column: 'id' }]);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    highlights: row.highlights ?? [],
    stylingNote: row.styling_note,
    categoryId: row.category_id,
    category: { name: row.category_name, slug: row.category_slug },
    priceCents: row.price_cents,
    isActive: Boolean(row.is_active),
    material: row.material,
    care: row.care,
    fit: row.fit,
    length: row.length,
    closure: row.closure,
    season: row.season,
    pattern: row.pattern,
    sizingNotes: row.sizing_notes,
    ratingAvg: toRating(row.rating_avg),
    reviewCount: row.review_count,
    images,
    variants: variants.map(toVariant),
  };
}

export async function getProduct(id) {
  const product = await loadProduct(db, id);
  if (!product) throw notFound();
  return product;
}

const ORDERS = {
  newest: [
    { column: 'products.created_at', order: 'desc' },
    { column: 'products.id', order: 'desc' },
  ],
  title: [
    { column: 'products.title', order: 'asc' },
    { column: 'products.id', order: 'asc' },
  ],
  price_asc: [
    { column: 'products.price_cents', order: 'asc' },
    { column: 'products.id', order: 'asc' },
  ],
  price_desc: [
    { column: 'products.price_cents', order: 'desc' },
    { column: 'products.id', order: 'asc' },
  ],
};

function applyFilters(query, { q, category, active }) {
  if (q) query.where('products.title', 'like', `%${escapeLike(q)}%`);
  if (category) query.whereIn('products.category_id', db('categories').select('id').where({ slug: category }));
  if (active !== undefined) query.where('products.is_active', active);
  return query;
}

export async function listProducts({ sort, page, limit, ...filters }) {
  const [{ total }] = await applyFilters(db('products'), filters).count({ total: '*' });
  const rows = await applyFilters(db('products'), filters)
    .join('categories', 'categories.id', 'products.category_id')
    .leftJoin('product_images', function () {
      this.on('product_images.product_id', 'products.id').andOnVal('product_images.position', '=', 0);
    })
    .select(
      'products.id',
      'products.slug',
      'products.title',
      'products.price_cents',
      'products.is_active',
      'categories.name as category_name',
      'categories.slug as category_slug',
      'product_images.url as image_url',
      db.raw('(SELECT COUNT(*) FROM variants WHERE variants.product_id = products.id) AS variant_count'),
      db.raw('(SELECT COALESCE(SUM(stock), 0) FROM variants WHERE variants.product_id = products.id) AS total_stock'),
    )
    .orderBy(ORDERS[sort])
    .limit(limit)
    .offset((page - 1) * limit);

  const items = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: { name: row.category_name, slug: row.category_slug },
    priceCents: row.price_cents,
    isActive: Boolean(row.is_active),
    variantCount: Number(row.variant_count),
    totalStock: Number(row.total_stock),
    imageUrl: row.image_url,
  }));
  return { items, page, limit, total: Number(total) };
}

// API field name to column. A field that is not sent (undefined) is not in the result, so a PATCH leaves it.
const COLUMNS = {
  title: 'title',
  slug: 'slug',
  description: 'description',
  stylingNote: 'styling_note',
  categoryId: 'category_id',
  priceCents: 'price_cents',
  isActive: 'is_active',
  material: 'material',
  care: 'care',
  fit: 'fit',
  length: 'length',
  closure: 'closure',
  season: 'season',
  pattern: 'pattern',
  sizingNotes: 'sizing_notes',
};

function toColumns(input) {
  const columns = {};
  for (const [field, column] of Object.entries(COLUMNS)) {
    if (input[field] !== undefined) columns[column] = input[field];
  }
  // A JSON column takes text, not a JavaScript array.
  if (input.highlights !== undefined) {
    columns.highlights = input.highlights === null ? null : JSON.stringify(input.highlights);
  }
  return columns;
}

// The database decides, not a check before the write, so two requests at once cannot both win.
function productWriteError(error) {
  if (error.code === 'ER_DUP_ENTRY') return new AppError(409, 'This slug is already used', 'SLUG_TAKEN');
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError(400, 'Invalid input', 'VALIDATION_ERROR', [
      { path: ['categoryId'], message: 'Unknown category' },
    ]);
  }
  return error;
}

// Replaces the whole list. A photo that stays keeps its width and height (they came with the dataset).
async function replaceImages(trx, productId, images) {
  const old = await trx('product_images').where({ product_id: productId }).select('url', 'width', 'height');
  const sizes = new Map(old.map((image) => [image.url, image]));
  await trx('product_images').where({ product_id: productId }).delete();
  await trx('product_images').insert(
    images.map((image, position) => ({
      product_id: productId,
      url: image.url,
      alt: image.alt ?? '',
      width: sizes.get(image.url)?.width ?? null,
      height: sizes.get(image.url)?.height ?? null,
      position,
    })),
  );
}

export async function createProduct(input) {
  return db.transaction(async (trx) => {
    let id;
    try {
      [id] = await trx('products').insert(toColumns(input));
    } catch (error) {
      throw productWriteError(error);
    }
    await replaceImages(trx, id, input.images);
    return loadProduct(trx, id);
  });
}

export async function updateProduct(id, input) {
  return db.transaction(async (trx) => {
    const existing = await trx('products').where({ id }).first('id').forUpdate();
    if (!existing) throw notFound();

    const columns = toColumns(input);
    if (Object.keys(columns).length > 0) {
      try {
        await trx('products').where({ id }).update(columns);
      } catch (error) {
        throw productWriteError(error);
      }
    }
    if (input.images) await replaceImages(trx, id, input.images);
    return loadProduct(trx, id);
  });
}

// Which unique key was hit tells the SKU from the color and size.
function variantWriteError(error) {
  if (error.code !== 'ER_DUP_ENTRY') return error;
  if (String(error.sqlMessage).includes('variants_sku_unique')) {
    return new AppError(409, 'This SKU is already used', 'SKU_TAKEN');
  }
  return new AppError(409, 'This product already has a variant with this color and size', 'VARIANT_TAKEN');
}

async function findVariant(id) {
  const row = await db('variants').where({ id }).first();
  if (!row) throw notFound();
  return row;
}

export async function createVariant(productId, { sku, color, size, stock }) {
  const product = await db('products').where({ id: productId }).first('id');
  if (!product) throw notFound();

  // The new variant goes last in the display order.
  const [{ last }] = await db('variants').where({ product_id: productId }).max({ last: 'position' });
  try {
    const [id] = await db('variants').insert({
      product_id: productId,
      sku,
      color_name: color,
      color_group: colorGroupFor(color),
      size,
      stock,
      position: last === null ? 0 : last + 1,
    });
    return toVariant(await db('variants').where({ id }).first());
  } catch (error) {
    throw variantWriteError(error);
  }
}

// The admin sets an exact stock number. A new color gets its color group again, for the shop filter.
export async function updateVariant(id, { stock, color, size }) {
  await findVariant(id);

  const columns = {};
  if (stock !== undefined) columns.stock = stock;
  if (color !== undefined) {
    columns.color_name = color;
    columns.color_group = colorGroupFor(color);
  }
  if (size !== undefined) columns.size = size;

  try {
    await db('variants').where({ id }).update(columns);
  } catch (error) {
    throw variantWriteError(error);
  }
  return toVariant(await findVariant(id));
}
