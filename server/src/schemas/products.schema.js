import { z } from 'zod';

// An absurd page would only make a huge OFFSET. No shop has this many pages.
const MAX_PAGE = 10000;

export const SORTS = ['newest', 'rating', 'price_asc', 'price_desc'];

// An empty value in the URL (`?q=`) counts as not sent.
const blankToUndefined = (value) => (value === '' ? undefined : value);
const param = (schema) => z.preprocess(blankToUndefined, schema);

export const listProductsSchema = z.object({
  category: param(z.string().max(60).optional()),
  sort: param(z.enum(SORTS).default('newest')),
  maxPriceCents: param(z.coerce.number().int().min(0).optional()),
  q: param(z.string().trim().max(100).optional()),
  page: param(z.coerce.number().int().min(1).max(MAX_PAGE).default(1)),
  limit: param(z.coerce.number().int().min(1).max(48).default(12)),
});

export const getProductSchema = z.object({
  slug: z.string().min(1).max(160),
});
