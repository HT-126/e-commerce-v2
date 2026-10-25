import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calledUrls, renderRoute, stubApi } from '../../test-utils.jsx';
import OrdersPage from './OrdersPage.jsx';

afterEach(() => vi.unstubAllGlobals());

const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };

const summary = (overrides = {}) => ({
  orderNumber: 'LM-261025-4821',
  status: 'paid',
  createdAt: '2026-10-25T12:00:00.000Z',
  totalCents: 4695,
  itemCount: 2,
  ...overrides,
});
const page = (items, { page: number = 1, total = items.length } = {}) => ({
  body: { data: { items, page: number, limit: 10, total } },
});

function renderOrders(handler, url = '/account/orders') {
  const fetchMock = stubApi(handler);
  renderRoute(<OrdersPage />, { path: '/account/orders', url });
  return fetchMock;
}

describe('OrdersPage', () => {
  it('shows a loading state first', () => {
    renderOrders(() => page([summary()]));

    expect(screen.getByRole('status', { name: 'Loading your orders' })).toBeInTheDocument();
  });

  it('lists the orders with date, status, items and total, each linking to its order', async () => {
    renderOrders(() =>
      page([
        summary(),
        summary({ orderNumber: 'LM-261020-0007', status: 'delivered', itemCount: 1, totalCents: 3000 }),
      ]),
    );

    const first = await screen.findByRole('link', { name: /LM-261025-4821/ });

    expect(first).toHaveAttribute('href', '/orders/LM-261025-4821');
    expect(first).toHaveTextContent('Oct 25, 2026 · Paid');
    expect(first).toHaveTextContent('$46.95');
    expect(first).toHaveTextContent('2 items');
    const second = screen.getByRole('link', { name: /LM-261020-0007/ });
    expect(second).toHaveTextContent('Delivered');
    expect(second).toHaveTextContent('1 item');
    expect(second).not.toHaveTextContent('1 items');
  });

  it('shows an empty state with a link to the shop', async () => {
    renderOrders(() => page([]));

    expect(await screen.findByText('You have no orders yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/shop');
  });

  it('shows an error with a retry button when the server fails', async () => {
    let answer = failure;
    renderOrders(() => answer);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your orders.');
    answer = page([summary()]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: /LM-261025-4821/ })).toBeInTheDocument();
  });

  it('asks the API for the page in the URL, 10 at a time', async () => {
    const fetchMock = renderOrders(() => page([summary()], { page: 2, total: 25 }), '/account/orders?page=2');

    await screen.findByRole('link', { name: /LM-261025-4821/ });

    expect(calledUrls(fetchMock)).toContain('/api/orders?page=2&limit=10');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('moves to the next page', async () => {
    const fetchMock = renderOrders(
      (url) =>
        url.includes('page=2')
          ? page([summary({ orderNumber: 'LM-261001-0002' })], { page: 2, total: 12 })
          : page([summary()], { page: 1, total: 12 }),
    );
    await screen.findByRole('link', { name: /LM-261025-4821/ });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('link', { name: /LM-261001-0002/ })).toBeInTheDocument();
    await waitFor(() => expect(calledUrls(fetchMock)).toContain('/api/orders?page=2&limit=10'));
  });

  it('shows no pagination for a single page', async () => {
    renderOrders(() => page([summary()]));
    await screen.findByRole('link', { name: /LM-261025-4821/ });

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});
