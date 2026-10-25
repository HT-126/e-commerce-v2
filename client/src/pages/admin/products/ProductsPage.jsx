import { Link } from 'react-router';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminProducts } from '../../../hooks/use-admin-products.js';
import { useCategories } from '../../../hooks/use-catalog.js';
import { formatMoney } from '../../../lib/format-money.js';
import { useListParams } from '../use-list-params.js';

const LIMIT = 20;

// Defined once, outside the component, because the table needs stable columns.
const columns = [
  {
    id: 'image',
    header: <span className="sr-only">Photo</span>,
    cell: ({ row }) => (
      <div className="h-14 w-11 overflow-hidden rounded-md bg-muted">
        {row.original.imageUrl && (
          <img src={row.original.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
        )}
      </div>
    ),
  },
  {
    id: 'title',
    header: 'Title',
    meta: { sort: { asc: 'title' } },
    cell: ({ row }) => (
      <Link
        to={`/admin/products/${row.original.id}`}
        className="line-clamp-2 max-w-xs font-medium underline-offset-4 hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  { id: 'category', header: 'Category', cell: ({ row }) => row.original.category.name },
  {
    id: 'priceCents',
    header: 'Price',
    meta: { sort: { asc: 'price_asc', desc: 'price_desc' } },
    cell: ({ row }) => formatMoney(row.original.priceCents),
  },
  { id: 'variantCount', header: 'Variants', cell: ({ row }) => row.original.variantCount },
  { id: 'totalStock', header: 'Stock', cell: ({ row }) => row.original.totalStock },
  {
    id: 'isActive',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'hidden'} />,
  },
];

const ACTIVE = [
  ['all', 'Active and hidden'],
  ['true', 'Active'],
  ['false', 'Hidden'],
];

export default function ProductsPage() {
  const { page, get, update } = useListParams();
  const q = get('q');
  const category = get('category');
  const active = get('active');
  const sort = get('sort') || undefined;
  const { data, isPending, isError, refetch } = useAdminProducts({ q, category, active, sort, page, limit: LIMIT });
  const categories = useCategories();
  const filtered = Boolean(q || category || active);

  function search(event) {
    event.preventDefault();
    update({ q: new FormData(event.currentTarget).get('q').trim() });
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl">Products</h1>
        <Button asChild>
          <Link to="/admin/products/new">New product</Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* `key` puts the text back to what the URL says (after "Clear" or a shared link). */}
        <form key={q} onSubmit={search} role="search" className="flex gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by title"
            aria-label="Search by title"
            maxLength={100}
            className="w-56"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Select value={category || 'all'} onValueChange={(value) => update({ category: value === 'all' ? '' : value })}>
          <SelectTrigger aria-label="Filter by category" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((item) => (
              <SelectItem key={item.id} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={active || 'all'} onValueChange={(value) => update({ active: value === 'all' ? '' : value })}>
          <SelectTrigger aria-label="Filter by status" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" onClick={() => update({ q: '', category: '', active: '' })}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={data?.items}
          total={data?.total}
          page={page}
          limit={LIMIT}
          sort={sort}
          onPageChange={(next) => update({ page: next })}
          onSortChange={(next) => update({ sort: next })}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage={filtered ? 'No products match these filters.' : 'No products yet.'}
        />
      </div>
    </section>
  );
}
