import { useParams, useSearchParams } from 'react-router';
import Pagination from '../../components/Pagination.jsx';
import ProductGrid from '../../components/ProductGrid.jsx';
import { SearchIcon } from '../../components/icons.jsx';
import { useCategories, useProducts } from '../../hooks/use-catalog.js';
import NotFoundPage from '../NotFoundPage.jsx';

const LIMIT = 12;

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

// "Under $X" means up to X.99, like the Under $45 tab on Home (4499).
const PRICES = [
  { value: '', label: 'Any price' },
  { value: '2499', label: 'Under $25' },
  { value: '4499', label: 'Under $45' },
  { value: '7499', label: 'Under $75' },
];

const fieldClass = 'min-h-11 rounded-full border border-border bg-white px-4 text-sm';

export default function ShopPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useCategories();

  const sort = searchParams.get('sort') ?? 'newest';
  const maxPriceCents = searchParams.get('maxPriceCents') ?? '';
  const q = searchParams.get('q') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const products = useProducts(
    { category, sort, maxPriceCents, q, page, limit: LIMIT },
    { keepPrevious: true },
  );

  // Filters live in the URL so a link shows the same list. Changing a filter goes back to page 1.
  function update(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  }

  const knownCategory = categories.data?.find((c) => c.slug === category);
  if (category && categories.data && !knownCategory) return <NotFoundPage />;

  const title = knownCategory?.name ?? (q ? `Results for “${q}”` : 'All products');
  const totalPages = products.data ? Math.ceil(products.data.total / LIMIT) : 0;

  return (
    <section>
      <h1 className="font-serif text-4xl">{title}</h1>
      {products.data && (
        <p className="mt-1 text-sm text-ink-soft">
          {products.data.total} {products.data.total === 1 ? 'product' : 'products'}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: new FormData(event.currentTarget).get('q').trim() });
          }}
        >
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
          {/* `key` resets the field when the URL changes from outside (back button, links). */}
          <input
            key={q}
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by title"
            aria-label="Search by title"
            maxLength={100}
            className={`${fieldClass} w-full pl-11`}
          />
        </form>

        <select
          aria-label="Sort by"
          value={sort}
          onChange={(event) => update({ sort: event.target.value })}
          className={fieldClass}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Price"
          value={maxPriceCents}
          onChange={(event) => update({ maxPriceCents: event.target.value })}
          className={fieldClass}
        >
          {PRICES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8">
        <ProductGrid
          items={products.data?.items}
          isPending={products.isPending}
          isError={products.isError}
          onRetry={products.refetch}
          skeletonCount={LIMIT}
          emptyMessage="No products match your search. Try a different filter."
        />
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={(next) => update({ page: String(next) })} />
    </section>
  );
}
