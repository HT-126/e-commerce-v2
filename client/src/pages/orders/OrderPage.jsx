import { Link, useLocation, useParams } from 'react-router';
import Button from '../../components/Button.jsx';
import { useOrder } from '../../hooks/use-orders.js';
import { formatDate } from '../../lib/format-date.js';
import { formatMoney } from '../../lib/format-money.js';
import NotFoundPage from '../NotFoundPage.jsx';
import { statusLabel } from './order-status.js';

function OrderSkeleton() {
  return (
    <div role="status" aria-label="Loading your order" className="animate-pulse space-y-4">
      <div className="h-10 w-72 rounded bg-card" />
      <div className="h-44 rounded-[28px] bg-card" />
      <div className="h-44 rounded-[28px] bg-card" />
    </div>
  );
}

function OrderItem({ item }) {
  return (
    <li className="flex gap-4 rounded-[28px] bg-white p-4 sm:gap-6">
      {/* The title is the link for keyboards and screen readers; the photo is a bigger target for the mouse. */}
      <Link
        to={`/products/${item.productSlug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-[20px] bg-card sm:w-28"
      >
        {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="size-full object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/products/${item.productSlug}`} className="font-serif text-xl leading-snug hover:underline">
            {item.title}
          </Link>
          <p className="mt-1 text-sm text-ink-soft">
            {item.color} · {item.size}
          </p>
          <p className="mt-1 text-sm">
            {item.quantity} × {formatMoney(item.unitPriceCents)}
          </p>
        </div>
        <p className="shrink-0 font-medium">{formatMoney(item.lineTotalCents)}</p>
      </div>
    </li>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-lg font-medium' : 'text-sm'}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// The confirmation after paying, and the detail of an order from the history. Everything shown is the copy
// kept with the order, not the live product.
export default function OrderPage() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const { data: order, isPending, isError, error, refetch } = useOrder(orderNumber);

  if (isPending) return <OrderSkeleton />;
  if (isError && error.status === 404) return <NotFoundPage />;
  if (isError) {
    return (
      <div role="alert" className="rounded-[28px] bg-card p-8 text-center">
        <p className="text-error">Could not load this order.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section>
      {state?.placed && (
        <p role="status" className="mb-6 rounded-2xl bg-white px-5 py-3 text-sm">
          Thank you! Your order is confirmed.
        </p>
      )}
      <h1 className="font-serif text-4xl">
        Order <span className="italic text-highlight">{order.orderNumber}</span>
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {formatDate(order.createdAt)} · {statusLabel(order.status)}
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {order.items.map((item) => (
            <OrderItem key={`${item.productSlug}-${item.color}-${item.size}`} item={item} />
          ))}
        </ul>

        <aside className="h-fit rounded-[28px] bg-white p-6">
          <h2 className="font-serif text-2xl">Summary</h2>
          <dl className="mt-4 space-y-2">
            <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
            <Row label="Shipping" value={order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)} />
            <div className="border-t border-border pt-3">
              <Row label="Total" value={formatMoney(order.totalCents)} strong />
            </div>
          </dl>
          <div className="mt-5 flex flex-col gap-3">
            <Button to="/shop">Continue shopping</Button>
            <Button to="/account/orders" variant="outline">
              All my orders
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
