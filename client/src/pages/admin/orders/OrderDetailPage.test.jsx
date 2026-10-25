import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { anAdminOrder, anOrderItem, calledUrls, renderRoute, stubApi } from '../../../test-utils.jsx';
import OrderDetailPage from './OrderDetailPage.jsx';

afterEach(() => {
  vi.unstubAllGlobals();
  // Toasts live in one shared store, so one test's toast would still be on screen in the next.
  toast.dismiss();
});

const notFound = { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };
const invalidChange = { status: 400, body: { error: { message: 'x', code: 'INVALID_STATUS_CHANGE' } } };

const NEXT = { shipped: ['delivered'], delivered: [], cancelled: [] };

// A fake API with one order that changes status like the real one. `patch`: an answer to use instead.
function renderOrder({ order = anAdminOrder(), get, patch } = {}) {
  let current = order;
  const fetchMock = stubApi((url, init) => {
    if (init?.method === 'PATCH') {
      if (patch) return patch;
      const { status } = JSON.parse(init.body);
      current = { ...current, status, allowedStatuses: NEXT[status] ?? [] };
      return { body: { data: current } };
    }
    return get ?? { body: { data: current } };
  });
  renderRoute(
    <>
      <OrderDetailPage />
      <Toaster />
    </>,
    { path: '/admin/orders/:orderNumber', url: `/admin/orders/${order.orderNumber}` },
  );
  return fetchMock;
}

const patches = (fetchMock) => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');

describe('admin OrderDetailPage', () => {
  it('shows a loading state first', () => {
    renderOrder();

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('shows the order number, status, date, customer, lines and totals', async () => {
    renderOrder({
      order: anAdminOrder({
        items: [anOrderItem({ quantity: 2, unitPriceCents: 4000, lineTotalCents: 8000 })],
        subtotalCents: 8000,
        shippingCents: 695,
        totalCents: 8695,
      }),
    });

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Order LM-261025-4821');
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Oct 25, 2026')).toBeInTheDocument();
    expect(screen.getByText('Anna Kim')).toBeInTheDocument();
    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    expect(screen.getByText('Blue Dress')).toBeInTheDocument();
    expect(screen.getByText('2 × $40.00')).toBeInTheDocument();
    expect(screen.getByText('$86.95')).toBeInTheDocument();
    expect(screen.getByText('$6.95')).toBeInTheDocument();
  });

  it('links back to the orders', async () => {
    renderOrder();

    expect(await screen.findByRole('link', { name: '← Orders' })).toHaveAttribute('href', '/admin/orders');
  });

  describe('the status buttons', () => {
    it('show only the changes the server allows for a paid order', async () => {
      renderOrder();

      expect(await screen.findByRole('button', { name: 'Mark as shipped' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Mark as delivered' })).not.toBeInTheDocument();
    });

    it('show only "Mark as delivered" for a shipped order', async () => {
      renderOrder({ order: anAdminOrder({ status: 'shipped', allowedStatuses: ['delivered'] }) });

      expect(await screen.findByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Mark as shipped' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
    });

    it.each(['delivered', 'cancelled'])('show none for a %s order, and say it cannot change', async (status) => {
      renderOrder({ order: anAdminOrder({ status, allowedStatuses: [] }) });

      expect(await screen.findByText(`This order is ${status}. It cannot change any more.`)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Mark as|Cancel order/ })).not.toBeInTheDocument();
    });
  });

  it('marks the order as shipped, shows the new status and the next button, and says so in a toast', async () => {
    const fetchMock = renderOrder();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as shipped' }));

    expect(await screen.findByText('Order marked as shipped')).toBeInTheDocument();
    expect(JSON.parse(patches(fetchMock)[0][1].body)).toEqual({ status: 'shipped' });
    expect(calledUrls(fetchMock)).toContain('/api/admin/orders/LM-261025-4821');
    expect(await screen.findByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark as shipped' })).not.toBeInTheDocument();
  });

  it('marks a shipped order as delivered', async () => {
    renderOrder({ order: anAdminOrder({ status: 'shipped', allowedStatuses: ['delivered'] }) });
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as delivered' }));

    expect(await screen.findByText('Order marked as delivered')).toBeInTheDocument();
    expect(await screen.findByText('This order is delivered. It cannot change any more.')).toBeInTheDocument();
  });

  describe('cancelling', () => {
    it('asks first, and "Keep order" changes nothing', async () => {
      const fetchMock = renderOrder();
      fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Cancel this order?')).toBeInTheDocument();
      expect(within(dialog).getByText(/back into stock/)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Keep order' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(patches(fetchMock)).toEqual([]);
    });

    it('cancels after "Yes, cancel order", and says the items are back in stock', async () => {
      const fetchMock = renderOrder();
      fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));

      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, cancel order' }));

      expect(await screen.findByText('Order cancelled and the items are back in stock')).toBeInTheDocument();
      expect(JSON.parse(patches(fetchMock)[0][1].body)).toEqual({ status: 'cancelled' });
      expect(await screen.findByText('This order is cancelled. It cannot change any more.')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('does not cancel when the shipping button is used', async () => {
      const fetchMock = renderOrder();
      fireEvent.click(await screen.findByRole('button', { name: 'Mark as shipped' }));
      await screen.findByText('Order marked as shipped');

      expect(patches(fetchMock)).toHaveLength(1);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('says so in a toast when the change fails, and keeps the buttons', async () => {
    renderOrder({ patch: failure });
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as shipped' }));

    expect(await screen.findByText('Could not update the order. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as shipped' })).toBeEnabled();
  });

  it('says the order has changed, and reloads it, when another admin got there first', async () => {
    const fetchMock = renderOrder({ patch: invalidChange });
    await screen.findByRole('button', { name: 'Mark as shipped' });
    const before = calledUrls(fetchMock).length;

    fireEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }));

    expect(await screen.findByText('This order has changed. The page is updated.')).toBeInTheDocument();
    await waitFor(() => expect(calledUrls(fetchMock).length).toBeGreaterThan(before + 1));
  });

  it('shows not found for an unknown order', async () => {
    renderOrder({ get: notFound });

    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to orders' })).toHaveAttribute('href', '/admin/orders');
  });

  it('shows an error with a retry button when the order cannot be loaded', async () => {
    renderOrder({ get: failure });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this order.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
