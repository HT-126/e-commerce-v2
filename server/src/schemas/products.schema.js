import { z } from 'zod';

// An absurd page would only make a huge OFFSET. No shop has this many pages.
const MAX_PAGE = 10000;

export const SORTS = ['newest', 'rating', 'price_asc', 'price_desc'];

// An empty value in the URL (`?q=`) counts as not sent.
const blankToUndefined = (value) => (value === '' ? undefined : value);
export const param = (schema) => z.preprocess(blankToUndefined, schema);

// "black, white" becomes ['black', 'white']: trimmed, no empty parts, no duplicates.
const MAX_COLORS = 15;
const MAX_SIZES = 20;
const list = (max, { lower = false } = {}) =>
  param(
    z
      .string()
      .transform((value) => [
        ...new Set(
          value
            .split(',')
            .map((item) => (lower ? item.trim().toLowerCase() : item.trim()))
            .filter(Boolean),
        ),
      ])
      .pipe(z.array(z.string().max(20)).max(max))
      .optional(),
  );

export const listProductsSchema = z
  .object({
    category: param(z.string().max(60).optional()),
    sort: param(z.enum(SORTS).default('newest')),
    minPriceCents: param(z.coerce.number().int().min(0).optional()),
    maxPriceCents: param(z.coerce.number().int().min(0).optional()),
    color: list(MAX_COLORS, { lower: true }),
    size: list(MAX_SIZES),
    q: param(z.string().trim().max(100).optional()),
    page: param(z.coerce.number().int().min(1).max(MAX_PAGE).default(1)),
    limit: param(z.coerce.number().int().min(1).max(48).default(12)),
  })
  .refine(
    (query) =>
      query.minPriceCents === undefined ||
      query.maxPriceCents === undefined ||
      query.minPriceCents <= query.maxPriceCents,
    {
      message: 'minPriceCents must not be greater than maxPriceCents',
      path: ['minPriceCents'],
    },
  );

export const getProductSchema = z.object({
  slug: z.string().min(1).max(160),
});
