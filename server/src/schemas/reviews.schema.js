import { z } from 'zod';

// An absurd page would only make a huge OFFSET.
const MAX_PAGE = 10000;

export const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// A rating only is allowed: no comment, or one that is empty after trimming, is saved as `null`.
export const saveReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((comment) => comment || null),
});
