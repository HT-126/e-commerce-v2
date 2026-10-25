import { useParams, useSearchParams } from 'react-router';
import Button from '../../components/Button.jsx';
import Pagination from '../../components/Pagination.jsx';
import ProductGrid from '../../components/ProductGrid.jsx';
import { useCategories, useFilters, useProducts } from '../../hooks/use-catalog.js';
import NotFoundPage from '../NotFoundPage.jsx';
import ShopFilters from './ShopFilters.jsx';
import { CLEARED_FILTERS, LIMIT, hasActiveFilters, readShopParams, toApiParams } from './shop-params.js';

export default function ShopPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useCategories();
  const filters = useFilters();

  const params = readShopParams(searchParams, { sizes: filters.data?.sizes });
  const hasFilters = hasActiveFilters(params);
  const products = useProducts(toApiParams(category, params), { keepPrevious: true });

  // Everything lives in the URL, so a refresh or a shared link shows the same list.
  // Changing a filter goes back to page 1.
  function update(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  }

  const clearFilters = () => update(CLEARED_FILTERS);

  const knownCategory = categories.data?.find((c) => c.slug === category);
  if (category && categories.data && !knownCategory) return <NotFoundPage />;

  const title = knownCategory?.name ?? (params.q ? `Results for “${params.q}”` : 'All products');
  const totalPages = products.data ? Math.ceil(products.data.total / LIMIT) : 0;

  return (
    <section>
      <h1 className="font-serif text-4xl">{title}</h1>
      {products.data && (
        <p className="mt-1 text-sm text-ink-soft">
          {products.data.total} {products.data.total === 1 ? 'product' : 'products'}
        </p>
      )}

      <ShopFilters
        filters={filters}
        params={params}
        hasFilters={hasFilters}
        onChange={update}
        onClear={clearFilters}
      />

      {/* While the next page loads, the current one stays visible but dimmed. */}
      <div
        className={`mt-8 transition-opacity ${products.isPlaceholderData ? 'opacity-60' : ''}`}
        aria-busy={products.isPlaceholderData}
      >
        <ProductGrid
          items={products.data?.items}
          isPending={products.isPending}
          isError={products.isError}
          onRetry={products.refetch}
          skeletonCount={LIMIT}
          emptyMessage={hasFilters ? 'No products match these filters.' : 'No products found.'}
          emptyAction={
            hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )
          }
        />
      </div>

      {/* A page past the end (typed in the URL) still gets a way back: Previous jumps to the last page. */}
      <Pagination
        page={params.page}
        totalPages={totalPages}
        onChange={(next) => update({ page: String(Math.min(next, Math.max(totalPages, 1))) })}
      />
    </section>
  );
}
