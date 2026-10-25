// Pure helpers for the catalog queries, so they can be unit tested without a database.

// `\` is MySQL's default LIKE escape, so a typed % or _ is searched as plain text.
export const escapeLike = (text) => text.replace(/[\\%_]/g, '\\$&');

// MySQL puts NULL first in ascending order, so `desc` puts products without a rating last.
// The id is the last tie-break, so paging never shows a product twice.
const ORDERS = {
  newest: [
    { column: 'products.created_at', order: 'desc' },
    { column: 'products.id', order: 'desc' },
  ],
  rating: [
    { column: 'products.rating_avg', order: 'desc' },
    { column: 'products.review_count', order: 'desc' },
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

export const productOrder = (sort) => ORDERS[sort];

// Variants come in display order. Colors and sizes keep that order, without duplicates.
export function variantOptions(variants) {
  return {
    colors: [...new Set(variants.map((v) => v.color))],
    sizes: [...new Set(variants.map((v) => v.size))],
  };
}
