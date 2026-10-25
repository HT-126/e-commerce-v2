import { z } from 'zod';

// An absurd page would only make a huge OFFSET.
const MAX_PAGE = 10000;

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const getOrderSchema = z.object({
  orderNumber: z.string().min(1).max(20),
});
