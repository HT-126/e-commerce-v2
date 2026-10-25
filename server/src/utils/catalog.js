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

// The sizes people expect first, in order. Number sizes (4, 6, 16W, 9(29)) come after, in natural order.
const LETTER_SIZES = [
  'XS',
  'S',
  'S/M',
  'M',
  'M/L',
  'L',
  'L/XL',
  'XL',
  'XL/1XL',
  '1XL',
  '1XL/2XL',
  '2XL',
  '2XL/3XL',
  '3XL',
  '4XL',
  '5XL',
  '6XL',
  '0XL',
  '1X',
  '2X',
  '3X',
  '4X',
  'One Size',
];
const SIZE_RANK = new Map(LETTER_SIZES.map((size, index) => [size, index]));

export function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const rankA = SIZE_RANK.get(a);
    const rankB = SIZE_RANK.get(b);
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
    return a.localeCompare(b, 'en', { numeric: true });
  });
}
