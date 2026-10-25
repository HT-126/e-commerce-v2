import { screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { anOrder, anOrderItem, renderRoute, stubApi } from '../../test-utils.jsx';
import OrderPage from './OrderPage.jsx';

afterEach(() => vi.unstubAllGlobals());

const notFound = { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };

// `state`: what the cart page passes when the order was just placed.
function renderOrder(answer, { state } = {}) {
  stubApi(() => answer);
  // Shows the router state the page is left with.
  function State() {
    return <p data-testid="state">{JSON.stringify(useLocation().state)}</p>;
  }
  renderRoute(
    <>
      <OrderPage />
      <State />
    </>,
    { path: '/orders/:orderNumber', url: '/orders/LM-261025-4821', state },
  );
}

describe('OrderPage', () => {
  it('shows a loading state first', () => {
    renderOrder({ body: { data: anOrder() } });

    expect(screen.getByRole('status', { name: 'Loading your order' })).toBeInTheDocument();
  });

  it('shows the order number, date, status, lines and totals', async () => {
    const order = anOrder({
      items: [
        anOrderItem({ title: 'Blue Dress', quantity: 2, unitPriceCents: 4000, lineTotalCents: 8000 }),
        anOrderItem({ productSlug: 'red-top', title: 'Red Top', color: 'Red', size: 'S' }),
      ],
      subtotalCents: 12000,
      shippingCents: 0,
      totalCents: 12000,
      status: 'shipped',
    });
    renderOrder({ body: { data: order } });

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Order LM-261025-4821');
    expect(screen.getByText('Oct 25, 2026 · Shipped')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Blue Dress' })).toHaveAttribute('href', '/products/blue-dress');
    expect(screen.getByText('Blue · M')).toBeInTheDocument();
    expect(screen.getByText('2 × $40.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Red Top' })).toBeInTheDocument();
    const summary = screen.getByRole('complementary');
    expect(summary).toHaveTextContent('Subtotal$120.00');
    expect(summary).toHaveTextContent('ShippingFree');
    expect(summary).toHaveTextContent('Total$120.00');
  });

  it('shows the flat shipping fee when it was charged', async () => {
    renderOrder({ body: { data: anOrder() } });

    const summary = await screen.findByRole('complementary');

    expect(summary).toHaveTextContent('Shipping$6.95');
    expect(summary).toHaveTextContent('Total$46.95');
  });

  it('thanks the shopper right after paying', async () => {
    renderOrder({ body: { data: anOrder() } }, { state: { placed: true } });

    expect(await screen.findByText('Thank you! Your order is confirmed.')).toBeInTheDocument();
  });

  it('removes "placed" from the history entry, so a refresh or Back does not thank the shopper again', async () => {
    renderOrder({ body: { data: anOrder() } }, { state: { placed: true } });

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('null'));
    expect(await screen.findByText('Thank you! Your order is confirmed.')).toBeInTheDocument();
  });

  it('does not thank the shopper when the order is opened later', async () => {
    renderOrder({ body: { data: anOrder() } });
    await screen.findByRole('heading', { level: 1 });

    expect(screen.queryByText('Thank you! Your order is confirmed.')).not.toBeInTheDocument();
  });

  it('links to the shop and to all orders', async () => {
    renderOrder({ body: { data: anOrder() } });

    expect(await screen.findByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'All my orders' })).toHaveAttribute('href', '/account/orders');
  });

  it('shows the not found page for an order that is not the user\'s', async () => {
    renderOrder(notFound);

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('shows an error with a retry button when the server fails', async () => {
    renderOrder(failure);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this order.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
