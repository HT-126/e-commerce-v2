import { z } from 'zod';
import { MAX_QUANTITY } from '../utils/cart.js';

const MAX_ITEMS = 50;

const quantity = z.number().int().min(1).max(MAX_QUANTITY);
const variantId = z.number().int().positive();
const items = z.array(z.object({ variantId, quantity })).max(MAX_ITEMS);

export const quoteCartSchema = z.object({ items });
export const mergeCartSchema = z.object({ items });
export const setCartItemSchema = z.object({ quantity });

// The id comes from the URL, so it is a string until it is turned into a number here.
export const cartItemParamsSchema = z.object({ variantId: z.coerce.number().int().positive() });
