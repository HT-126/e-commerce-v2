import { StarIcon } from './icons.jsx';

// Five stars, filled up to the rounded rating.
export default function RatingStars({ rating, className = 'size-4' }) {
  const filled = Math.round(rating);
  return (
    <span role="img" aria-label={`Rated ${rating} out of 5`} className="inline-flex text-ink">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= filled} className={className} />
      ))}
    </span>
  );
}
