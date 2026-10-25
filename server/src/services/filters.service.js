import { db } from '../db/knex.js';
import { sortSizes } from '../utils/catalog.js';
import { COLOR_GROUPS } from '../utils/color-groups.js';

// Options for the shop filters: only what exists on active products. No stock numbers.
export async function getFilters() {
  const rows = await db('variants')
    .join('products', 'products.id', 'variants.product_id')
    .where('products.is_active', true)
    .distinct('variants.color_group', 'variants.size');

  const groups = new Set(rows.map((row) => row.color_group));
  return {
    colors: COLOR_GROUPS.filter((group) => groups.has(group.key)),
    sizes: sortSizes([...new Set(rows.map((row) => row.size))]),
  };
}
