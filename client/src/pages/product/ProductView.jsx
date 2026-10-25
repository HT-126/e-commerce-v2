import { useState } from 'react';
import { Link } from 'react-router';
import Button from '../../components/Button.jsx';
import OptionChip from '../../components/OptionChip.jsx';
import QuantityStepper from '../../components/QuantityStepper.jsx';
import { ReturnIcon, RulerIcon, StarIcon, TruckIcon } from '../../components/icons.jsx';
import { formatMoney } from '../../lib/format-money.js';
import ProductGallery from './ProductGallery.jsx';

// Fit text from `sizingNotes`, else `fit` and `length` (business-rules.md).
function fitText({ sizingNotes, fit, length }) {
  if (sizingNotes) return sizingNotes;
  const parts = [fit && `${fit} fit`, length && `${length} length`].filter(Boolean);
  return parts.length > 0 ? `${parts.join(', ')}.` : null;
}

export default function ProductView({ product }) {
  const { colors, sizes, variants } = product;
  const hasStock = (color, size) => variants.some((v) => v.color === color && v.size === size && v.inStock);
  const colorHasStock = (color) => variants.some((v) => v.color === color && v.inStock);

  // The first color with any size in stock is picked by default.
  const [color, setColor] = useState(colors.find(colorHasStock) ?? colors[0]);
  const [size, setSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const allSoldOut = !colors.some(colorHasStock);
  const fit = fitText(product);

  function chooseColor(next) {
    setColor(next);
    // Keep the size only if this color has it in stock.
    if (size && !hasStock(next, size)) setSize(null);
  }

  function chooseSize(next) {
    setSize(next);
    setSizeError(false);
  }

  function addToBag() {
    if (!size) {
      setSizeError(true);
      return;
    }
    // Adding to the bag comes with the Cart feature.
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery images={product.images} title={product.title} />

      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-ink-soft">{product.category.name}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">{product.title}</h1>

        <p className="mt-4 flex items-center gap-4">
          <span className="text-xl font-medium">{formatMoney(product.priceCents)}</span>
          {product.reviewCount > 0 && product.ratingAvg !== null && (
            <span className="flex items-center gap-1 text-sm text-ink-soft">
              <StarIcon className="size-4 text-ink" />
              {product.ratingAvg.toFixed(1)} · {product.reviewCount}{' '}
              {product.reviewCount === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </p>

        <div className="mt-6">
          <p className="text-sm">
            <span className="font-medium">Color:</span> {color}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((c) => (
              <OptionChip
                key={c}
                label={c}
                selected={c === color}
                soldOut={!colorHasStock(c)}
                onClick={() => chooseColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <p>
              <span className="font-medium">Size:</span> {size ?? 'Select a size'}
            </p>
            {product.sizeChart && (
              <a href="#size-chart" className="underline underline-offset-4">
                Size chart
              </a>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((s) => (
              <OptionChip
                key={s}
                label={s}
                selected={s === size}
                soldOut={!hasStock(color, s)}
                onClick={() => chooseSize(s)}
              />
            ))}
          </div>
          {sizeError && (
            <p role="alert" className="mt-2 text-sm text-error">
              Please choose a size.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <Button className="flex-1" disabled={allSoldOut} onClick={addToBag}>
            {allSoldOut ? 'Sold out' : `Add to bag · ${formatMoney(product.priceCents * quantity)}`}
          </Button>
        </div>

        <ul className="mt-6 space-y-2 border-t border-border pt-6 text-sm text-ink-soft">
          <li className="flex items-center gap-3">
            <TruckIcon className="size-4 shrink-0" /> Free US shipping over $97
          </li>
          <li className="flex items-center gap-3">
            <ReturnIcon className="size-4 shrink-0" /> 7-day returns
          </li>
          {fit && (
            <li className="flex items-start gap-3">
              <RulerIcon className="mt-0.5 size-4 shrink-0" /> {fit}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

export function Breadcrumb({ product }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-ink-soft">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link to="/" className="hover:underline">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to={`/shop/${product.category.slug}`} className="hover:underline">
            {product.category.name}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="text-ink">
          {product.title}
        </li>
      </ol>
    </nav>
  );
}
