import { StarIcon } from './icons.jsx';

// Pick 1 to 5 stars. A real group of radio buttons, so the keyboard (arrow keys) and screen readers work.
// The stars are filled up to the chosen one.
export default function StarRatingInput({ value, onChange, name = 'rating', legend = 'Your rating' }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex size-11 cursor-pointer items-center justify-center">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
            />
            <StarIcon
              filled={n <= value}
              className="size-8 rounded-full text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
            />
            <span className="sr-only">
              {n} {n === 1 ? 'star' : 'stars'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
