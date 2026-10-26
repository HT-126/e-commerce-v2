import { z } from 'zod';
import { param } from './products.schema.js';

const MAX_PAGE = 10000;

export const adminListReviewsSchema = z.object({
  productId: param(z.coerce.number().int().positive().optional()),
  page: param(z.coerce.number().int().min(1).max(MAX_PAGE).default(1)),
  limit: param(z.coerce.number().int().min(1).max(100).default(20)),
});
