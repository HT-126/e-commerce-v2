import Button from './Button.jsx';
import ProductCard from './ProductCard.jsx';

const gridClass = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4';

// Every list of products shows three states: loading, empty and error.
export default function ProductGrid({
  items,
  isPending,
  isError,
  onRetry,
  skeletonCount = 8,
  emptyMessage = 'No products found.',
  emptyAction = null,
}) {
  if (isPending) {
    return (
      <div className={gridClass} role="status" aria-label="Loading products">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="aspect-[3/5] animate-pulse rounded-[28px] bg-card" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-[28px] bg-card p-8 text-center">
        <p className="text-error">Could not load the products.</p>
        <Button variant="outline" className="mt-4" onClick={() => onRetry()}>
          Try again
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[28px] bg-card p-8 text-center">
        <p className="text-ink-soft">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
