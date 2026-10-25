import { Link } from 'react-router';
import QuantityStepper from '../../components/QuantityStepper.jsx';
import { formatMoney } from '../../lib/format-money.js';

// One line of the bag. A sold-out line is dimmed and can only be removed. A line with too little stock
// keeps its stepper so the shopper can lower the quantity. The stock number is never shown.
export default function CartLine({ line, disabled, onQuantity, onRemove }) {
  const soldOut = line.status === 'sold_out';
  const label = `${line.title}, ${line.color}, ${line.size}`;

  return (
    <li className="flex gap-4 rounded-[28px] bg-white p-4 sm:gap-6">
      {/* The title is the link for keyboards and screen readers; the photo is a bigger target for the mouse. */}
      <Link
        to={`/products/${line.productSlug}`}
        tabIndex={-1}
        aria-hidden="true"
        className={`aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-[20px] bg-card sm:w-32 ${soldOut ? 'opacity-50' : ''}`}
      >
        {line.imageUrl && <img src={line.imageUrl} alt="" loading="lazy" className="size-full object-cover" />}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The text is not faded: the dimmed photo, the "Sold out" label and the missing stepper show the state. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/products/${line.productSlug}`}
              className="font-serif text-xl leading-snug hover:underline"
            >
              {line.title}
            </Link>
            <p className="mt-1 text-sm text-ink-soft">
              {line.color} · {line.size}
            </p>
            <p className="mt-1 text-sm">{formatMoney(line.unitPriceCents)}</p>
          </div>
          {!soldOut && <p className="shrink-0 font-medium">{formatMoney(line.lineTotalCents)}</p>}
        </div>

        {soldOut && <p className="mt-2 text-sm font-medium text-error">Sold out</p>}
        {line.status === 'not_enough' && (
          <p role="alert" className="mt-2 text-sm text-error">
            Not enough stock for this quantity. Please lower it.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          {soldOut ? (
            <span />
          ) : (
            <div role="group" aria-label={`Quantity of ${label}`}>
              <QuantityStepper
                value={line.quantity}
                onChange={(next) => !disabled && onQuantity(line.variantId, next)}
              />
            </div>
          )}
          <button
            type="button"
            aria-label={`Remove ${label}`}
            disabled={disabled}
            onClick={() => onRemove(line.variantId)}
            className="min-h-11 px-2 text-sm underline underline-offset-4 hover:text-highlight disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
