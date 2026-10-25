import { z } from 'zod';
import { param } from './products.schema.js';

const MAX_PAGE = 10000;

export const adminListOrdersSchema = z.object({
  status: param(z.enum(['paid', 'shipped', 'delivered', 'cancelled']).optional()),
  q: param(z.string().trim().max(100).optional()),
  sort: param(z.enum(['newest', 'oldest', 'total_desc']).default('newest')),
  page: param(z.coerce.number().int().min(1).max(MAX_PAGE).default(1)),
  limit: param(z.coerce.number().int().min(1).max(100).default(20)),
});

// Which changes are allowed is a business rule, checked in the service (so the error is INVALID_STATUS_CHANGE).
export const updateOrderStatusSchema = z.object({
  status: z.enum(['paid', 'shipped', 'delivered', 'cancelled']),
});
