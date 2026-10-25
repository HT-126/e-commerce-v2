import { Link } from 'react-router';
import { formatMoney } from '../lib/format-money.js';

export default function ProductCard({ product }) {
  const { slug, title, priceCents, ratingAvg, reviewCount, imageUrl, imageAlt, soldOut } = product;

  return (
    <Link
      to={`/products/${slug}`}
      className="group block rounded-[28px] bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {/* Fixed ratio box: the card list has no photo size, and this stops the layout jumping. */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] bg-panel">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={imageAlt || title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-medium">
            Sold out
          </span>
        )}
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.75rem] px-2 text-center font-serif text-base leading-snug">
        {title}
      </p>
      <p className="mt-1 px-2 pb-1 text-center text-sm text-ink-soft">
        {formatMoney(priceCents)}
        {ratingAvg !== null && ` · ${ratingAvg.toFixed(1)} ★ (${reviewCount})`}
      </p>
    </Link>
  );
}
