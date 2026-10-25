import { useId } from 'react';

const inputClass =
  'min-h-[54px] w-full rounded-full border border-highlight bg-white px-5 text-base placeholder:text-ink-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[invalid=true]:border-error';

// A labelled text box with an optional hint and error under it. Works with React Hook Form's `register`
// (`ref` and the other props go straight to the input). `adornment` sits inside the box, on the right.
export default function TextField({ label, hint, error, adornment, className = '', ...inputProps }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // An error takes the place of the hint (they often say the same thing).
  const showHint = hint && !error;
  const describedBy = (showHint ? hintId : error ? errorId : undefined) || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClass} ${adornment ? 'pr-20' : ''}`}
          {...inputProps}
        />
        {adornment && <div className="absolute inset-y-0 right-5 flex items-center">{adornment}</div>}
      </div>
      {showHint && (
        <p id={hintId} className="mt-2 px-5 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2 px-5 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
