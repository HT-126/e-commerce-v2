import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminOrder, useChangeOrderStatus } from '../../../hooks/use-admin-orders.js';
import { ApiError } from '../../../lib/api.js';
import { formatDate } from '../../../lib/format-date.js';
import { formatMoney } from '../../../lib/format-money.js';

// What each next status is called on its button, and in the toast after it.
const ACTIONS = {
  shipped: { button: 'Mark as shipped', done: 'Order marked as shipped' },
  delivered: { button: 'Mark as delivered', done: 'Order marked as delivered' },
  cancelled: { button: 'Cancel order', done: 'Order cancelled and the items are back in stock' },
};

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-medium' : 'text-muted-foreground'}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { data: order, isPending, isError, error, refetch } = useAdminOrder(orderNumber);
  const change = useChangeOrderStatus(orderNumber);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function moveTo(status) {
    try {
      await change.mutateAsync(status);
      toast.success(ACTIONS[status].done);
    } catch (failure) {
      // The order may have changed since this page loaded (another admin, another tab): show what it is now.
      const stale = failure instanceof ApiError && failure.code === 'INVALID_STATUS_CHANGE';
      toast.error(stale ? 'This order has changed. The page is updated.' : 'Could not update the order. Please try again.');
      if (stale) refetch();
    } finally {
      setConfirmingCancel(false);
    }
  }

  if (isPending) return <p role="status" className="text-muted-foreground">Loading...</p>;
  if (isError && error.status === 404) {
    return (
      <section>
        <h1 className="font-serif text-3xl">Order not found</h1>
        <Link to="/admin/orders" className="mt-4 inline-block underline underline-offset-4">
          Back to orders
        </Link>
      </section>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="rounded-xl bg-card p-8 text-center">
        <p className="text-destructive">Could not load this order.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section>
      <Link to="/admin/orders" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Orders
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl">Order {order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-medium">Customer</h2>
            <p className="mt-2 text-sm">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{order.email}</p>
          </div>

          <ul className="divide-y rounded-xl border bg-white">
            {order.items.map((item) => (
              <li key={`${item.productSlug}-${item.color}-${item.size}`} className="flex gap-4 p-4">
                <div className="aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.color} · {item.size}
                  </p>
                  <p className="text-sm">
                    {item.quantity} × {formatMoney(item.unitPriceCents)}
                  </p>
                </div>
                <p className="shrink-0 font-medium">{formatMoney(item.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-medium">Totals</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotalCents)} />
              <Row label="Shipping" value={order.shippingCents === 0 ? 'Free' : formatMoney(order.shippingCents)} />
              <div className="border-t pt-2">
                <Row label="Total" value={formatMoney(order.totalCents)} strong />
              </div>
            </dl>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="font-medium">Status</h2>
            {order.allowedStatuses.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                This order is {order.status}. It cannot change any more.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {order.allowedStatuses.map((status) =>
                  status === 'cancelled' ? (
                    <Button
                      key={status}
                      variant="outline"
                      disabled={change.isPending}
                      onClick={() => setConfirmingCancel(true)}
                    >
                      {ACTIONS[status].button}
                    </Button>
                  ) : (
                    <Button key={status} disabled={change.isPending} onClick={() => moveTo(status)}>
                      {ACTIONS[status].button}
                    </Button>
                  ),
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        onOpenChange={setConfirmingCancel}
        title="Cancel this order?"
        description="The items go back into stock. A cancelled order cannot be changed again."
        confirmLabel="Yes, cancel order"
        cancelLabel="Keep order"
        pending={change.isPending}
        onConfirm={() => moveTo('cancelled')}
      />
    </section>
  );
}
