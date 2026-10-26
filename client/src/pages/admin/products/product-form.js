import { z } from 'zod';
import { formatMoney } from '../../../lib/format-money.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The same limits as the API (api.md), so a number that is too big is explained under its field.
export const MAX_PRICE_CENTS = 10_000_000;
export const MAX_STOCK = 1_000_000;
const MAX_PHOTOS = 10;
const MAX_HIGHLIGHTS = 20;

const isWebAddress = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

// One highlight per line, no empty lines.
export const splitLines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const optionalText = (max) => z.string().max(max, `At most ${max} characters`);

// The form keeps everything as text (that is what inputs hold). `toPayload` turns it into what the API wants.
// Whether the product is shown in the shop is not a form field: it has its own button on the edit page, so an
// old form can never save a stale status.
export const productFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title').max(200, 'At most 200 characters'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug')
    .max(160, 'At most 160 characters')
    .regex(SLUG, 'Use lower case letters, digits and single dashes'),
  categoryId: z.string().min(1, 'Choose a category'),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a price like 59.99')
    .refine((value) => Number(value) > 0, 'The price must be more than 0')
    .refine((value) => dollarsToCents(value) <= MAX_PRICE_CENTS, `The price can be at most ${formatMoney(MAX_PRICE_CENTS)}`),
  description: optionalText(5000),
  highlights: z
    .string()
    .refine((text) => splitLines(text).length <= MAX_HIGHLIGHTS, `At most ${MAX_HIGHLIGHTS} lines`)
    .refine((text) => splitLines(text).every((line) => line.length <= 200), 'Each line can have at most 200 characters'),
  stylingNote: optionalText(1000),
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
        url: z
          .string()
          .trim()
          .min(1, 'Enter the photo address')
          .max(500, 'At most 500 characters')
          .refine(isWebAddress, 'Use a web address that starts with http:// or https://'),
        alt: z.string().max(255, 'At most 255 characters'),
      }),
    )
    .min(1, 'Add at least one photo')
    .max(MAX_PHOTOS, `At most ${MAX_PHOTOS} photos`),
});

export const EMPTY_PRODUCT = {
  title: '',
  slug: '',
  categoryId: '',
  price: '',
  description: '',
  highlights: '',
  stylingNote: '',
  material: '',
  care: '',
  fit: '',
  length: '',
  closure: '',
  season: '',
  pattern: '',
  sizingNotes: '',
  images: [{ url: '', alt: '' }],
};

// "59.99" is 5999 cents. The price is typed in dollars; money is cents everywhere else.
export const dollarsToCents = (text) => Math.round(Number(text) * 100);
export const centsToDollars = (cents) => (cents / 100).toFixed(2);

// "Linen Midi Dress!" becomes "linen-midi-dress". Accents are dropped, anything else that is not a letter or
// a digit becomes a dash.
export function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');
}

const orNull = (text) => text.trim() || null;

// The API product from the form values. An empty optional field becomes null, which clears it.
export function toPayload(values) {
  return {
    title: values.title.trim(),
    slug: values.slug.trim(),
    categoryId: Number(values.categoryId),
    priceCents: dollarsToCents(values.price),
    description: orNull(values.description),
    highlights: splitLines(values.highlights),
    stylingNote: orNull(values.stylingNote),
    material: orNull(values.material),
    care: orNull(values.care),
    fit: orNull(values.fit),
    length: orNull(values.length),
    closure: orNull(values.closure),
    season: orNull(values.season),
    pattern: orNull(values.pattern),
    sizingNotes: orNull(values.sizingNotes),
    images: values.images.map((image) => ({ url: image.url.trim(), alt: image.alt.trim() })),
  };
}

// The form values from a product the API returned.
export function toFormValues(product) {
  return {
    title: product.title,
    slug: product.slug,
    categoryId: String(product.categoryId),
    price: centsToDollars(product.priceCents),
    description: product.description ?? '',
    highlights: product.highlights.join('\n'),
    stylingNote: product.stylingNote ?? '',
    material: product.material ?? '',
    care: product.care ?? '',
    fit: product.fit ?? '',
    length: product.length ?? '',
    closure: product.closure ?? '',
    season: product.season ?? '',
    pattern: product.pattern ?? '',
    sizingNotes: product.sizingNotes ?? '',
    images: product.images.map((image) => ({ url: image.url, alt: image.alt ?? '' })),
  };
}

// Where a field the server complained about is in the form: the API names its fields differently.
const FIELD_OF = { priceCents: 'price' };
export function formFieldFor(path) {
  const [first, ...rest] = path;
  return [FIELD_OF[first] ?? first, ...rest].join('.');
}
