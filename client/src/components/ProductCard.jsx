import { Link } from 'react-router';
import { formatMoney } from '../lib/format-money.js';
import { StarIcon } from './icons.jsx';

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
      <p className="mt-1 px-2 text-center text-sm text-ink-soft">{formatMoney(priceCents)}</p>
      {/* The line is always there (min-h-5), so a product without a rating does not make a shorter card.
          The space below it is a margin: padding would count inside min-h-5 and make rated cards taller. */}
      <p className="mb-1 mt-0.5 flex min-h-5 items-center justify-center px-2 text-sm text-ink-soft">
        {ratingAvg !== null && (
          <>
            <span className="sr-only">
              Rated {ratingAvg.toFixed(1)} out of 5 from {reviewCount}{' '}
              {reviewCount === 1 ? 'review' : 'reviews'}
            </span>
            <span aria-hidden="true" className="flex items-center gap-1">
              <StarIcon className="size-3.5 text-ink" />
              {ratingAvg.toFixed(1)} ({reviewCount})
            </span>
          </>
        )}
      </p>
    </Link>
  );
}
