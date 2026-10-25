import { cleanColor, cleanSize } from './clean.js';
import { parseDescription } from './parse-description.js';

// Flat categories in header menu order. `sources` are part 3 of `category.full_path`.
export const CATEGORIES = [
  { name: 'Tops', slug: 'tops', sources: ['Clothing Tops'] },
  { name: 'Dresses', slug: 'dresses', sources: ['Dresses'] },
  { name: 'Bottoms', slug: 'bottoms', sources: ['Pants', 'Shorts', 'Skirts'] },
  { name: 'Sets', slug: 'sets', sources: ['Outfit Sets'] },
  { name: 'Jumpsuits & Rompers', slug: 'jumpsuits-rompers', sources: ['One-Pieces'] },
  { name: 'Swimwear', slug: 'swimwear', sources: ['Swimwear'] },
  { name: 'Outerwear', slug: 'outerwear', sources: ['Outerwear'] },
  { name: 'Activewear', slug: 'activewear', sources: ['Activewear'] },
];

const SLUG_BY_SOURCE = new Map(CATEGORIES.flatMap((c) => c.sources.map((source) => [source, c.slug])));

// Category slug for a source product, or null when we do not import it (jewelry, shoes, lingerie...).
export function categorySlugFor(fullPath) {
  const [, second, third] = String(fullPath).split(' > ');
  return second === 'Clothing' ? (SLUG_BY_SOURCE.get(third) ?? null) : null;
}

// Empty string means null.
const blank = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

const IN_STOCK = 10;

// If cleaning makes two variants equal (same color and size), keep the first and warn.
function mapVariants(source, warn) {
  const seen = new Set();
  const variants = [];
  source.variants.forEach((v, position) => {
    const colorName = cleanColor(v.options.Color);
    const size = cleanSize(v.options.Size);
    const key = `${colorName}|${size}`;
    if (seen.has(key)) {
      warn(`Duplicate variant after cleaning in "${source.handle}": ${colorName} / ${size}. Kept the first.`);
      return;
    }
    seen.add(key);
    variants.push({ sku: v.sku, color_name: colorName, size, position, stock: v.in_stock ? IN_STOCK : 0 });
  });
  return variants;
}

// One source product -> rows for products, product_images and variants (without ids).
export function mapProduct(source, warn = console.warn) {
  const parsed = parseDescription(source.description_html);
  const meta = source.metafields ?? {};
  const rating = source.reviews?.rating ?? null;
  const ratingAvg = rating === null ? null : Math.round(rating * 10) / 10;
  const reviewCount = rating === null ? 0 : (source.reviews?.count ?? 0);

  return {
    product: {
      source_id: String(source.id),
      slug: source.handle,
      title: source.title,
      description: parsed.description ?? blank(meta.ai_summary),
      highlights: parsed.highlights ? JSON.stringify(parsed.highlights) : null,
      styling_note: parsed.stylingNote,
      size_chart: parsed.sizeChart ? JSON.stringify(parsed.sizeChart) : null,
      price_cents: Math.round(source.price.min_usd * 100),
      seed_rating_avg: ratingAvg,
      seed_review_count: reviewCount,
      rating_avg: ratingAvg,
      review_count: reviewCount,
      material: blank(meta.material),
      care: blank(meta.care),
      fit: blank(meta.fit),
      length: blank(meta.length),
      closure: blank(meta.closure),
      season: blank(meta.season),
      pattern: blank(meta.pattern),
      sizing_notes: parsed.sizingNotes ?? blank(meta.sizing_notes),
      created_at: new Date(source.created_at),
    },
    images: source.images.map((image, position) => ({
      url: image.url,
      alt: image.alt ?? '',
      width: image.width ?? null,
      height: image.height ?? null,
      position,
    })),
    variants: mapVariants(source, warn),
  };
}
