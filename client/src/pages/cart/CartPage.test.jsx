import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '../../stores/cart-store.js';
import { aCart, aCartLine, aUser, bodiesSentTo, calledUrls, renderRoute, stubApi } from '../../test-utils.jsx';
import CartPage from './CartPage.jsx';

const signedOut = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };
const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };

// The line the server would return for a variant. `overrides[variantId]` changes one line (a status, a price).
const lineFor = (variantId, quantity, overrides = {}) =>
  aCartLine({
    variantId,
    quantity,
    title: `Dress ${variantId}`,
    lineTotalCents: 4000 * quantity,
    ...overrides[variantId],
  });

// A fake API with a bag that changes, like the real one.
// `user` null: a guest, whose bag is the store and is priced by the quote.
// `bag`: a signed-in user's lines. `overrides`: per-variant changes to the lines. `fail`: URLs that answer 500.
function renderCart({ user = null, bag = [], overrides = {}, fail = [] } = {}) {
  let account = [...bag];
  const fetchMock = stubApi((url, init) => {
    if (fail.includes(url)) return failure;
    if (url === '/api/auth/me') return user ? { body: { data: { user } } } : signedOut;
    if (url === '/api/cart/quote') {
      const { items } = JSON.parse(init.body);
      return { body: { data: aCart(items.map((i) => lineFor(i.variantId, i.quantity, overrides))) } };
    }
    if (url === '/api/cart') return { body: { data: aCart(account) } };

    const variantId = Number(url.split('/').pop());
    if (init.method === 'PUT') {
      const { quantity } = JSON.parse(init.body);
      account = account.map((line) =>
        line.variantId === variantId
          ? { ...line, quantity, lineTotalCents: line.unitPriceCents * quantity }
          : line,
      );
    }
    if (init.method === 'DELETE') account = account.filter((line) => line.variantId !== variantId);
    return { body: { data: aCart(account) } };
  });

  function SignInPage() {
    const { state } = useLocation();
    return <p data-testid="sign-in">sign in, back to {state?.from}</p>;
  }
  renderRoute(<CartPage />, {
    path: '/cart',
    url: '/cart',
    extraRoutes: <Route path="/login" element={<SignInPage />} />,
  });
  return fetchMock;
}

const guestBag = (...items) => useCartStore.setState({ items });
const rowOf = (title) => screen.getByRole('link', { name: title }).closest('li');

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

describe('CartPage', () => {
  it('shows a loading state while the bag loads', () => {
    guestBag({ variantId: 1, quantity: 1 });
    renderCart();

    expect(screen.getByRole('status', { name: 'Loading your bag' })).toBeInTheDocument();
  });

  it('shows an empty bag to a guest without asking the server for prices', async () => {
    const fetchMock = renderCart();

    expect(await screen.findByText('Your bag is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/shop');
    expect(calledUrls(fetchMock)).not.toContain('/api/cart/quote');
  });

  it('shows a signed-in user with an empty bag the empty state', async () => {
    renderCart({ user: aUser() });

    expect(await screen.findByText('Your bag is empty.')).toBeInTheDocument();
  });

  it("prices a guest's bag with the quote and shows the lines and totals", async () => {
    guestBag({ variantId: 1, quantity: 2 }, { variantId: 2, quantity: 1 });
    const fetchMock = renderCart();

    expect(await screen.findByRole('link', { name: 'Dress 1' })).toHaveAttribute('href', '/products/blue-dress');
    expect(bodiesSentTo(fetchMock, '/api/cart/quote')[0]).toEqual({
      items: [
        { variantId: 1, quantity: 2 },
        { variantId: 2, quantity: 1 },
      ],
    });
    expect(within(rowOf('Dress 1')).getByText('Blue · M')).toBeInTheDocument();
    expect(within(rowOf('Dress 1')).getByText('$80.00')).toBeInTheDocument();
    // 3 x $40.00 is $120.00, which ships free.
    const summary = screen.getByRole('complementary');
    expect(within(summary).getByText('Subtotal').nextSibling).toHaveTextContent('$120.00');
    expect(within(summary).getByText('Shipping').nextSibling).toHaveTextContent('Free');
    expect(within(summary).getByText('Total').nextSibling).toHaveTextContent('$120.00');
  });

  it('shows the flat shipping fee and how much is missing for free shipping', async () => {
    guestBag({ variantId: 1, quantity: 1 });
    renderCart();

    const summary = await screen.findByRole('complementary');

    expect(within(summary).getByText('Shipping').nextSibling).toHaveTextContent('$6.95');
    expect(within(summary).getByText('Total').nextSibling).toHaveTextContent('$46.95');
    expect(within(summary).getByText('Add $57.00 more for free shipping.')).toBeInTheDocument();
  });

  it('shows a signed-in user the bag from the account', async () => {
    const fetchMock = renderCart({
      user: aUser(),
      bag: [lineFor(1, 1, {}), lineFor(2, 3, {})],
    });

    expect(await screen.findByRole('link', { name: 'Dress 2' })).toBeInTheDocument();
    expect(calledUrls(fetchMock)).toContain('/api/cart');
    expect(calledUrls(fetchMock)).not.toContain('/api/cart/quote');
    expect(screen.queryByRole('link', { name: 'Sign in to pay' })).not.toBeInTheDocument();
  });

  it('offers a guest a way to sign in and come back to the bag', async () => {
    guestBag({ variantId: 1, quantity: 1 });
    renderCart();

    fireEvent.click(await screen.findByRole('link', { name: 'Sign in to pay' }));

    expect(await screen.findByTestId('sign-in')).toHaveTextContent('back to /cart');
  });

  it('has no Pay button yet', async () => {
    renderCart({ user: aUser(), bag: [lineFor(1, 1)] });
    await screen.findByRole('link', { name: 'Dress 1' });

    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
  });

  describe('lines that cannot be bought', () => {
    const overrides = { 2: { status: 'sold_out' }, 3: { status: 'not_enough' } };
    const bag = [{ variantId: 1, quantity: 1 }, { variantId: 2, quantity: 1 }, { variantId: 3, quantity: 5 }];

    it('shows a sold-out line dimmed, with only Remove', async () => {
      guestBag(...bag);
      renderCart({ overrides });
      await screen.findByRole('link', { name: 'Dress 2' });

      const row = within(rowOf('Dress 2'));

      expect(row.getByText('Sold out')).toBeInTheDocument();
      expect(row.getByRole('button', { name: /Remove Dress 2/ })).toBeInTheDocument();
      expect(row.queryByRole('button', { name: 'Increase quantity' })).not.toBeInTheDocument();
      expect(row.queryByRole('button', { name: 'Decrease quantity' })).not.toBeInTheDocument();
    });

    it('asks to lower the quantity of a line with too little stock, and keeps its stepper', async () => {
      guestBag(...bag);
      renderCart({ overrides });
      await screen.findByRole('link', { name: 'Dress 3' });

      const row = within(rowOf('Dress 3'));

      expect(row.getByRole('alert')).toHaveTextContent('Not enough stock for this quantity. Please lower it.');
      expect(row.getByRole('button', { name: 'Decrease quantity' })).toBeEnabled();
    });

    it('blocks checkout and says why, counting only the lines that are ok', async () => {
      guestBag(...bag);
      renderCart({ overrides });

      const summary = await screen.findByRole('complementary');

      expect(within(summary).getByText(/Fix them to check out/)).toBeInTheDocument();
      expect(within(summary).getByText('Subtotal').nextSibling).toHaveTextContent('$40.00');
    });

    it('shows no blocking message when every line is ok', async () => {
      guestBag({ variantId: 1, quantity: 1 });
      renderCart();

      await screen.findByRole('complementary');

      expect(screen.queryByText(/Fix them to check out/)).not.toBeInTheDocument();
    });
  });

  describe('a guest changing the bag', () => {
    it('raises the quantity in the browser and prices the bag again', async () => {
      guestBag({ variantId: 1, quantity: 1 });
      const fetchMock = renderCart();
      await screen.findByRole('link', { name: 'Dress 1' });

      fireEvent.click(within(rowOf('Dress 1')).getByRole('button', { name: 'Increase quantity' }));

      await waitFor(() => expect(within(rowOf('Dress 1')).getByText('$80.00')).toBeInTheDocument());
      expect(useCartStore.getState().items).toEqual([{ variantId: 1, quantity: 2 }]);
      expect(bodiesSentTo(fetchMock, '/api/cart/quote').at(-1)).toEqual({
        items: [{ variantId: 1, quantity: 2 }],
      });
    });

    it('removes a line, and shows the empty bag after the last one', async () => {
      guestBag({ variantId: 1, quantity: 1 });
      renderCart();
      await screen.findByRole('link', { name: 'Dress 1' });

      fireEvent.click(screen.getByRole('button', { name: /Remove Dress 1/ }));

      expect(await screen.findByText('Your bag is empty.')).toBeInTheDocument();
      expect(useCartStore.getState().items).toEqual([]);
    });

    it('can remove a sold-out line', async () => {
      guestBag({ variantId: 1, quantity: 1 }, { variantId: 2, quantity: 1 });
      renderCart({ overrides: { 2: { status: 'sold_out' } } });
      await screen.findByRole('link', { name: 'Dress 2' });

      fireEvent.click(screen.getByRole('button', { name: /Remove Dress 2/ }));

      await waitFor(() => expect(screen.queryByRole('link', { name: 'Dress 2' })).not.toBeInTheDocument());
      expect(useCartStore.getState().items).toEqual([{ variantId: 1, quantity: 1 }]);
    });
  });

  describe('a signed-in user changing the bag', () => {
    it('sets the quantity on the server and shows the answer', async () => {
      const fetchMock = renderCart({ user: aUser(), bag: [lineFor(1, 1)] });
      await screen.findByRole('link', { name: 'Dress 1' });

      fireEvent.click(within(rowOf('Dress 1')).getByRole('button', { name: 'Increase quantity' }));

      await waitFor(() => expect(within(rowOf('Dress 1')).getByText('$80.00')).toBeInTheDocument());
      expect(bodiesSentTo(fetchMock, '/api/cart/items/1')).toEqual([{ quantity: 2 }]);
    });

    it('removes a line on the server', async () => {
      const fetchMock = renderCart({ user: aUser(), bag: [lineFor(1, 1), lineFor(2, 1)] });
      await screen.findByRole('link', { name: 'Dress 1' });

      fireEvent.click(screen.getByRole('button', { name: /Remove Dress 1/ }));

      await waitFor(() => expect(screen.queryByRole('link', { name: 'Dress 1' })).not.toBeInTheDocument());
      expect(screen.getByRole('link', { name: 'Dress 2' })).toBeInTheDocument();
      expect(fetchMock.mock.calls.some(([url, init]) => url === '/api/cart/items/1' && init.method === 'DELETE')).toBe(
        true,
      );
    });

    it('says so when a change fails, and keeps the line', async () => {
      renderCart({ user: aUser(), bag: [lineFor(1, 1)], fail: ['/api/cart/items/1'] });
      await screen.findByRole('link', { name: 'Dress 1' });

      fireEvent.click(within(rowOf('Dress 1')).getByRole('button', { name: 'Increase quantity' }));

      expect(await screen.findByText('Could not update your bag. Please try again.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Dress 1' })).toBeInTheDocument();
    });
  });

  it('shows an error with a retry button when the bag cannot be loaded', async () => {
    renderCart({ user: aUser(), bag: [lineFor(1, 1)], fail: ['/api/cart'] });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your bag.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
