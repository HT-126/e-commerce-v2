import { MinusIcon, PlusIcon } from './icons.jsx';

const buttonClass =
  'flex size-11 items-center justify-center rounded-full hover:bg-panel disabled:cursor-not-allowed disabled:opacity-40';

// Quantity per line is 1 to 9 (business-rules.md).
export default function QuantityStepper({ value, onChange, min = 1, max = 9 }) {
  return (
    <div className="inline-flex items-center rounded-full border border-ink/30">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={buttonClass}
      >
        <MinusIcon className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-8 text-center text-sm">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={buttonClass}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
