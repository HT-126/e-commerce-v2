import { Link, useSearchParams } from 'react-router';
import Button from '../../components/Button.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOrders } from '../../hooks/use-orders.js';
import { formatDate } from '../../lib/format-date.js';
import { formatMoney } from '../../lib/format-money.js';
import { statusLabel } from './order-status.js';

const LIMIT = 10;
const MAX_PAGE = 10000;

function OrdersSkeleton() {
  return (
    <div role="status" aria-label="Loading your orders" className="animate-pulse space-y-4">
      <div className="h-24 rounded-[28px] bg-card" />
      <div className="h-24 rounded-[28px] bg-card" />
      <div className="h-24 rounded-[28px] bg-card" />
    </div>
  );
}

function OrderRow({ order }) {
  return (
    <li>
      <Link
        to={`/orders/${order.orderNumber}`}
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-[28px] bg-white p-5 hover:bg-white/70"
      >
        <span>
          <span className="block font-serif text-xl">{order.orderNumber}</span>
          <span className="block text-sm text-ink-soft">
            {formatDate(order.createdAt)} · {statusLabel(order.status)}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-medium">{formatMoney(order.totalCents)}</span>
          <span className="block text-sm text-ink-soft">
            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
          </span>
        </span>
      </Link>
    </li>
  );
}

// The page is in the URL (`?page=2`), so a refresh or a shared link shows the same list.
export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1));
  const { data, isPending, isError, refetch, isPlaceholderData } = useOrders({ page, limit: LIMIT });
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  const goToPage = (next) => {
    const target = Math.min(next, Math.max(totalPages, 1));
    setSearchParams(target > 1 ? { page: String(target) } : {});
  };

  return (
    <section>
      <h1 className="font-serif text-4xl">
        My <span className="italic text-highlight">orders</span>
      </h1>

      <div className="mt-8">
        {isPending ? (
          <OrdersSkeleton />
        ) : isError ? (
          <div role="alert" className="rounded-[28px] bg-card p-8 text-center">
            <p className="text-error">Could not load your orders.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : data.items.length === 0 && page === 1 ? (
          <div className="rounded-[28px] bg-card p-8 text-center">
            <p>You have no orders yet.</p>
            <Button to="/shop" className="mt-4">
              Continue shopping
            </Button>
          </div>
        ) : (
          <>
            <ul aria-busy={isPlaceholderData} className="space-y-4">
              {data.items.map((order) => (
                <OrderRow key={order.orderNumber} order={order} />
              ))}
            </ul>
            {/* A page past the end (typed in the URL) still gets a way back: Previous jumps to the last page. */}
            <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
          </>
        )}
      </div>
    </section>
  );
}
