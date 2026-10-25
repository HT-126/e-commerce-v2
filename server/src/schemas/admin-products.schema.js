import { z } from 'zod';
import { param } from './products.schema.js';

const MAX_PAGE = 10000;

// An id in the URL arrives as text.
export const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });

export const adminListProductsSchema = z.object({
  q: param(z.string().trim().max(100).optional()),
  category: param(z.string().max(60).optional()),
  active: param(
    z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  ),
  sort: param(z.enum(['newest', 'title', 'price_asc', 'price_desc']).default('newest')),
  page: param(z.coerce.number().int().min(1).max(MAX_PAGE).default(1)),
  limit: param(z.coerce.number().int().min(1).max(100).default(20)),
});

// Optional text: left out stays left out (a PATCH does not touch it); null or empty clears it to null.
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value === undefined ? undefined : value || null));

const productFields = {
  title: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lower case letters, digits and single dashes'),
  description: optionalText(5000),
  highlights: z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .nullish()
    .transform((lines) => (lines === undefined ? undefined : lines?.length ? lines : null)),
  stylingNote: optionalText(1000),
  categoryId: z.number().int().positive(),
  priceCents: z.number().int().min(1).max(10_000_000),
  isActive: z.boolean(),
  material: optionalText(120),
  care: optionalText(255),
  fit: optionalText(40),
  length: optionalText(40),
  closure: optionalText(60),
  season: optionalText(40),
  pattern: optionalText(60),
  sizingNotes: optionalText(2000),
  images: z
    .array(
      z.object({
        url: z.url({ protocol: /^https?$/ }).max(500),
        alt: z.string().trim().max(255).optional(),
      }),
    )
    .min(1)
    .max(10),
};

export const createProductSchema = z.object(productFields);

const hasChange = (changes) => Object.values(changes).some((value) => value !== undefined);

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine(hasChange, { message: 'Send at least one field to change' });

const stock = z.number().int().min(0).max(1_000_000);
const color = z.string().trim().min(1).max(60);
const size = z.string().trim().min(1).max(20);

export const createVariantSchema = z.object({
  sku: z.string().trim().min(1).max(40),
  color,
  size,
  stock,
});

export const updateVariantSchema = z
  .object({ stock, color, size })
  .partial()
  .refine(hasChange, { message: 'Send at least one field to change' });
