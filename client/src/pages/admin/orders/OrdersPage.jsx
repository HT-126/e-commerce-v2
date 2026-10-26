import { Link } from 'react-router';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminOrders } from '../../../hooks/use-admin-orders.js';
import { formatDate } from '../../../lib/format-date.js';
import { formatMoney } from '../../../lib/format-money.js';
import { useListParams } from '../use-list-params.js';

const LIMIT = 20;
// The Select cannot have an empty value, so "no filter" is `all`.
const STATUSES = [
  ['all', 'All statuses'],
  ['paid', 'Paid'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
];

// Defined once, outside the component, because the table needs stable columns.
const columns = [
  {
    id: 'orderNumber',
    header: 'Order',
    cell: ({ row }) => (
      <Link to={`/admin/orders/${row.original.orderNumber}`} className="font-medium underline-offset-4 hover:underline">
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    id: 'createdAt',
    header: 'Date',
    meta: { sort: { asc: 'oldest', desc: 'newest' } },
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  { id: 'email', header: 'Customer', cell: ({ row }) => row.original.email },
  { id: 'itemCount', header: 'Items', cell: ({ row }) => row.original.itemCount },
  {
    id: 'totalCents',
    header: 'Total',
    meta: { sort: { desc: 'total_desc' } },
    cell: ({ row }) => formatMoney(row.original.totalCents),
  },
  { id: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

export default function OrdersPage() {
  const { page, get, update } = useListParams();
  const status = get('status');
  const q = get('q');
  const sort = get('sort') || undefined;
  const { data, isPending, isError, refetch } = useAdminOrders({ status, q, sort, page, limit: LIMIT });

  function search(event) {
    event.preventDefault();
    update({ q: new FormData(event.currentTarget).get('q').trim() });
  }

  return (
    <section>
      <h1 className="font-serif text-3xl">Orders</h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* `key` puts the text back to what the URL says (after "Clear" or a shared link). */}
        <form key={q} onSubmit={search} role="search" className="flex gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Order number or email"
            aria-label="Search by order number or email"
            maxLength={100}
            className="w-64"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Select value={status || 'all'} onValueChange={(value) => update({ status: value === 'all' ? '' : value })}>
          <SelectTrigger aria-label="Filter by status" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(q || status) && (
          <Button variant="ghost" onClick={() => update({ q: '', status: '' })}>
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
          emptyMessage={q || status ? 'No orders match these filters.' : 'No orders yet.'}
        />
      </div>
    </section>
  );
}
