import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calledUrls, renderRoute, stubApi } from '../../../test-utils.jsx';
import OrdersPage from './OrdersPage.jsx';

afterEach(() => vi.unstubAllGlobals());

const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };

const order = (overrides = {}) => ({
  orderNumber: 'LM-261025-4821',
  status: 'paid',
  createdAt: '2026-10-25T12:00:00.000Z',
  email: 'anna@example.com',
  totalCents: 4695,
  itemCount: 2,
  ...overrides,
});
const page = (items, { total = items.length } = {}) => ({ body: { data: { items, page: 1, limit: 20, total } } });

function renderOrders(handler, url = '/admin/orders') {
  const fetchMock = stubApi(handler);
  renderRoute(<OrdersPage />, { path: '/admin/orders', url });
  return fetchMock;
}
const lastUrl = (fetchMock) => calledUrls(fetchMock).at(-1);

// Radix Select opens with the keyboard in a test, and an option is picked with Enter.
function pick(triggerName, optionName) {
  const trigger = screen.getByRole('combobox', { name: triggerName });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  const option = screen.getByRole('option', { name: optionName });
  fireEvent.keyDown(option, { key: 'Enter' });
}

describe('admin OrdersPage', () => {
  it('shows a loading state first', () => {
    renderOrders(() => page([order()]));

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('lists the orders with number, date, customer, items, total and status', async () => {
    renderOrders(() => page([order(), order({ orderNumber: 'LM-261020-0007', status: 'delivered', itemCount: 1 })]));

    const link = await screen.findByRole('link', { name: 'LM-261025-4821' });
    const row = link.closest('tr');
    expect(link).toHaveAttribute('href', '/admin/orders/LM-261025-4821');
    expect(within(row).getByText('Oct 25, 2026')).toBeInTheDocument();
    expect(within(row).getByText('anna@example.com')).toBeInTheDocument();
    expect(within(row).getByText('$46.95')).toBeInTheDocument();
    expect(within(row).getByText('Paid')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: 'LM-261020-0007' }).closest('tr')).getByText('Delivered')).toBeInTheDocument();
  });

  it('asks the API for the page, sort and filters in the URL', async () => {
    const fetchMock = renderOrders(
      () => page([order()], { total: 45 }),
      '/admin/orders?status=paid&q=anna&sort=oldest&page=2',
    );
    await screen.findByRole('link', { name: 'LM-261025-4821' });

    expect(calledUrls(fetchMock)).toContain('/api/admin/orders?status=paid&q=anna&sort=oldest&page=2&limit=20');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Search/ })).toHaveValue('anna');
  });

  it('asks for the next page', async () => {
    const fetchMock = renderOrders(() => page([order()], { total: 45 }));
    await screen.findByRole('link', { name: 'LM-261025-4821' });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(lastUrl(fetchMock)).toBe('/api/admin/orders?page=2&limit=20'));
  });

  it('sorts when a sortable header is clicked', async () => {
    const fetchMock = renderOrders(() => page([order()]));
    await screen.findByRole('link', { name: 'LM-261025-4821' });

    fireEvent.click(screen.getByRole('button', { name: /Date/ }));
    await waitFor(() => expect(lastUrl(fetchMock)).toBe('/api/admin/orders?sort=oldest&page=1&limit=20'));

    fireEvent.click(screen.getByRole('button', { name: /Total/ }));
    await waitFor(() => expect(lastUrl(fetchMock)).toBe('/api/admin/orders?sort=total_desc&page=1&limit=20'));
  });

  it('filters by status, and goes back to page 1', async () => {
    const fetchMock = renderOrders(() => page([order()], { total: 45 }), '/admin/orders?page=3');
    await screen.findByRole('link', { name: 'LM-261025-4821' });

    pick('Filter by status', 'Shipped');

    await waitFor(() => expect(lastUrl(fetchMock)).toBe('/api/admin/orders?status=shipped&page=1&limit=20'));
  });

  it('searches by order number or email, and goes back to page 1', async () => {
    const fetchMock = renderOrders(() => page([order()], { total: 45 }), '/admin/orders?page=2');
    await screen.findByRole('link', { name: 'LM-261025-4821' });

    fireEvent.change(screen.getByRole('textbox', { name: /Search/ }), { target: { value: '  ben@ ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(lastUrl(fetchMock)).toBe('/api/admin/orders?q=ben%40&page=1&limit=20'));
  });

  it('clears the filters', async () => {
    const fetchMock = renderOrders(() => page([order()]), '/admin/orders?status=paid&q=anna');
    await screen.findByRole('link', { name: 'LM-261025-4821' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(lastUrl(fetchMock)).toBe('/api/admin/orders?page=1&limit=20'));
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('says there are no orders, or none that match', async () => {
    renderOrders(() => page([]));
    expect(await screen.findByText('No orders yet.')).toBeInTheDocument();
  });

  it('says no order matches the filters', async () => {
    renderOrders(() => page([]), '/admin/orders?status=shipped');
    expect(await screen.findByText('No orders match these filters.')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    let answer = failure;
    renderOrders(() => answer);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this list.');
    answer = page([order()]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'LM-261025-4821' })).toBeInTheDocument();
  });
});
