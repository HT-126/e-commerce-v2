import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db/knex.js';
import { cleanTables } from '../helpers/db.js';

// Runs the real migration against rows that already exist: the upgrade path of a database with data.
// The test database is migrated to the latest version first, so each test steps this one migration back.
const MIGRATION = '20261025023242_add_color_group_to_variants.js';

async function insertVariantsOfTheOldSchema(colors) {
  const [categoryId] = await db('categories').insert({ name: 'Old', slug: 'old', position: 1 });
  const [productId] = await db('products').insert({
    slug: 'old-product',
    title: 'Old product',
    category_id: categoryId,
    price_cents: 1000,
  });
  await db('variants').insert(
    colors.map((color, position) => ({
      product_id: productId,
      sku: `OLD-${position}`,
      color_name: color,
      size: 'M',
      stock: 1,
      position,
    })),
  );
}

beforeEach(cleanTables);

// Always leave the test database on the latest schema, even if a test failed half way.
afterAll(async () => {
  await db.migrate.latest();
  await db.destroy();
});

describe('migration add_color_group_to_variants', () => {
  it('fills color_group for rows that already exist', async () => {
    await db.migrate.down({ name: MIGRATION });
    try {
      await insertVariantsOfTheOldSchema(['Black', 'Navy', 'Blush Pink', 'Black/Mauve', 'Floral', 'Medium']);
    } finally {
      await db.migrate.up({ name: MIGRATION });
    }

    const rows = await db('variants').select('color_name', 'color_group').orderBy('position');

    expect(rows.map((r) => [r.color_name, r.color_group])).toEqual([
      ['Black', 'black'],
      ['Navy', 'blue'],
      ['Blush Pink', 'pink'],
      ['Black/Mauve', 'black'],
      ['Floral', 'multicolor'],
      ['Medium', 'other'],
    ]);
  });

  it('adds the column with the default "other" and an index for the filters', async () => {
    const [columns] = await db.raw("SHOW COLUMNS FROM variants LIKE 'color_group'");
    const [indexes] = await db.raw(
      "SHOW INDEX FROM variants WHERE Key_name = 'variants_product_color_group_size_idx'",
    );

    expect(columns[0]).toMatchObject({ Type: 'varchar(20)', Null: 'NO', Default: 'other' });
    expect(indexes.map((i) => i.Column_name)).toEqual(['product_id', 'color_group', 'size']);
  });

  it('down removes the column and keeps the rows', async () => {
    await insertVariantsOfTheOldSchema(['Black', 'Navy']);

    await db.migrate.down({ name: MIGRATION });
    try {
      expect(await db.schema.hasColumn('variants', 'color_group')).toBe(false);
      expect(await db('variants').count({ n: '*' }).first()).toEqual({ n: 2 });
    } finally {
      await db.migrate.up({ name: MIGRATION });
    }

    expect(await db.schema.hasColumn('variants', 'color_group')).toBe(true);
  });
});
