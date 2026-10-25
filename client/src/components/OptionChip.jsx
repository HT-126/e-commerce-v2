// A color or size choice. A sold-out choice stays visible but cannot be picked.
export default function OptionChip({ label, selected = false, soldOut = false, onClick }) {
  const state = selected
    ? 'border-primary bg-primary text-on-primary'
    : 'border-border bg-white hover:border-ink/40';
  const sold = soldOut ? 'cursor-not-allowed text-ink-soft line-through opacity-50' : '';

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={soldOut}
      onClick={onClick}
      className={`min-h-11 min-w-11 rounded-full border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${state} ${sold}`}
    >
      {label}
      {soldOut && (
        <>
          {' '}
          <span className="sr-only">(sold out)</span>
        </>
      )}
    </button>
  );
}
