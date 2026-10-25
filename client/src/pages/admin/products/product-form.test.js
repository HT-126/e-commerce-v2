import { describe, expect, it } from 'vitest';
import {
  EMPTY_PRODUCT,
  centsToDollars,
  dollarsToCents,
  formFieldFor,
  productFormSchema,
  slugify,
  splitLines,
  toFormValues,
  toPayload,
} from './product-form.js';

const valid = (overrides = {}) => ({
  ...EMPTY_PRODUCT,
  title: 'Linen Midi Dress',
  slug: 'linen-midi-dress',
  categoryId: '3',
  price: '59.99',
  images: [{ url: 'https://cdn.example/a.webp', alt: 'Front' }],
  ...overrides,
});
// The first message of each field, which is the one the form shows.
const errorsOf = (values) => {
  const result = productFormSchema.safeParse(values);
  const errors = {};
  for (const issue of result.success ? [] : result.error.issues) {
    errors[issue.path.join('.')] ??= issue.message;
  }
  return errors;
};

describe('slugify', () => {
  it.each([
    ['Linen Midi Dress', 'linen-midi-dress'],
    ['  Ribbed single-shoulder wrap midi dress!  ', 'ribbed-single-shoulder-wrap-midi-dress'],
    ['Café Crème', 'cafe-creme'],
    ['A & B / C', 'a-b-c'],
    ['2-Pack Tees', '2-pack-tees'],
    ['', ''],
    ['!!!', ''],
  ])('turns "%s" into "%s"', (title, slug) => {
    expect(slugify(title)).toBe(slug);
  });

  it('makes a slug the form accepts, at most 160 characters, without a dash at the end', () => {
    const slug = slugify(`${'word '.repeat(60)}end`);

    expect(slug.length).toBeLessThanOrEqual(160);
    expect(slug.endsWith('-')).toBe(false);
    expect(errorsOf(valid({ slug }))).toEqual({});
  });
});

describe('money', () => {
  it.each([
    ['59.99', 5999],
    ['60', 6000],
    ['0.5', 50],
    ['19.9', 1990],
    ['1234.56', 123456],
  ])('turns $%s into %i cents', (text, cents) => {
    expect(dollarsToCents(text)).toBe(cents);
  });

  it('has no floating point error for amounts like 19.99 and 1.15', () => {
    expect(dollarsToCents('19.99')).toBe(1999);
    expect(dollarsToCents('1.15')).toBe(115);
    expect(dollarsToCents('4.35')).toBe(435);
  });

  it('shows cents as dollars with two decimals', () => {
    expect(centsToDollars(5999)).toBe('59.99');
    expect(centsToDollars(6000)).toBe('60.00');
    expect(centsToDollars(5)).toBe('0.05');
  });
});

describe('splitLines', () => {
  it('gives one entry per line, trimmed, without empty lines', () => {
    expect(splitLines('  Soft  \n\n  Lined\n   \nFits true')).toEqual(['Soft', 'Lined', 'Fits true']);
    expect(splitLines('')).toEqual([]);
  });
});

describe('productFormSchema', () => {
  it('accepts a complete product', () => {
    expect(errorsOf(valid())).toEqual({});
  });

  it.each([
    ['a missing title', { title: '  ' }, 'title', 'Enter a title'],
    ['a title over 200 characters', { title: 'a'.repeat(201) }, 'title', 'At most 200 characters'],
    ['a missing slug', { slug: '' }, 'slug', 'Enter a slug'],
    ['a slug with capitals', { slug: 'Bad-Slug' }, 'slug', 'Use lower case letters, digits and single dashes'],
    ['a slug with spaces', { slug: 'bad slug' }, 'slug', 'Use lower case letters, digits and single dashes'],
    ['a slug with a double dash', { slug: 'a--b' }, 'slug', 'Use lower case letters, digits and single dashes'],
    ['no category', { categoryId: '' }, 'categoryId', 'Choose a category'],
    ['no price', { price: '' }, 'price', 'Enter a price like 59.99'],
    ['a price with letters', { price: '12abc' }, 'price', 'Enter a price like 59.99'],
    ['a price with 3 decimals', { price: '1.999' }, 'price', 'Enter a price like 59.99'],
    ['a negative price', { price: '-5' }, 'price', 'Enter a price like 59.99'],
    ['a price of 0', { price: '0.00' }, 'price', 'The price must be more than 0'],
    ['a material over 120 characters', { material: 'a'.repeat(121) }, 'material', 'At most 120 characters'],
    ['21 highlight lines', { highlights: Array.from({ length: 21 }, (_, i) => `L${i}`).join('\n') }, 'highlights', 'At most 20 lines'],
    ['a highlight line over 200 characters', { highlights: 'a'.repeat(201) }, 'highlights', 'Each line can have at most 200 characters'],
    ['no photos', { images: [] }, 'images', 'Add at least one photo'],
    ['11 photos', { images: Array.from({ length: 11 }, () => ({ url: 'https://cdn.example/a.webp', alt: '' })) }, 'images', 'At most 10 photos'],
    ['an empty photo address', { images: [{ url: '', alt: '' }] }, 'images.0.url', 'Enter the photo address'],
    ['a photo address that is not a web address', { images: [{ url: 'not a url', alt: '' }] }, 'images.0.url', 'Use a web address that starts with http:// or https://'],
    ['a javascript: photo address', { images: [{ url: 'javascript:alert(1)', alt: '' }] }, 'images.0.url', 'Use a web address that starts with http:// or https://'],
  ])('rejects %s, with the message under the right field', (_name, change, field, message) => {
    expect(errorsOf(valid(change))[field]).toBe(message);
  });

  it('names the photo that is wrong', () => {
    const errors = errorsOf(
      valid({ images: [{ url: 'https://cdn.example/a.webp', alt: '' }, { url: 'nope', alt: '' }] }),
    );

    expect(Object.keys(errors)).toEqual(['images.1.url']);
  });
});

describe('toPayload', () => {
  it('turns the form into what the API wants: cents, a number id, trimmed text, lines as a list', () => {
    const payload = toPayload(
      valid({
        title: '  Linen Midi Dress ',
        price: '59.99',
        highlights: 'Breathable\n\n Relaxed fit ',
        material: ' 100% linen ',
        images: [{ url: ' https://cdn.example/a.webp ', alt: ' Front ' }],
      }),
    );

    expect(payload).toMatchObject({
      title: 'Linen Midi Dress',
      slug: 'linen-midi-dress',
      categoryId: 3,
      priceCents: 5999,
      isActive: true,
      highlights: ['Breathable', 'Relaxed fit'],
      material: '100% linen',
      images: [{ url: 'https://cdn.example/a.webp', alt: 'Front' }],
    });
  });

  it('sends an empty optional field as null, which clears it', () => {
    const payload = toPayload(valid({ description: '   ', care: '' }));

    expect(payload.description).toBeNull();
    expect(payload.care).toBeNull();
    expect(payload.highlights).toEqual([]);
  });
});

describe('toFormValues', () => {
  const product = {
    id: 9,
    slug: 'linen-midi-dress',
    title: 'Linen Midi Dress',
    description: null,
    highlights: ['Breathable', 'Relaxed fit'],
    stylingNote: 'Wear it with sandals',
    categoryId: 3,
    priceCents: 5999,
    isActive: false,
    material: '100% linen',
    care: null,
    fit: null,
    length: null,
    closure: null,
    season: null,
    pattern: null,
    sizingNotes: null,
    images: [{ url: 'https://cdn.example/a.webp', alt: '' }],
  };

  it('fills the form from a product: dollars, text ids, lines in one text, nothing missing', () => {
    expect(toFormValues(product)).toEqual({
      ...EMPTY_PRODUCT,
      title: 'Linen Midi Dress',
      slug: 'linen-midi-dress',
      categoryId: '3',
      price: '59.99',
      isActive: false,
      highlights: 'Breathable\nRelaxed fit',
      stylingNote: 'Wear it with sandals',
      material: '100% linen',
      images: [{ url: 'https://cdn.example/a.webp', alt: '' }],
    });
  });

  it('gives a form that is valid and goes back to the same payload', () => {
    const values = toFormValues(product);

    expect(productFormSchema.safeParse(values).success).toBe(true);
    expect(toPayload(values)).toMatchObject({ priceCents: 5999, categoryId: 3, highlights: product.highlights });
  });
});

describe('formFieldFor', () => {
  it('names the form field for a field the API complained about', () => {
    expect(formFieldFor(['priceCents'])).toBe('price');
    expect(formFieldFor(['categoryId'])).toBe('categoryId');
    expect(formFieldFor(['images', 1, 'url'])).toBe('images.1.url');
  });
});
