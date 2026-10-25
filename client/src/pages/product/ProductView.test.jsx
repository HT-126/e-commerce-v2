import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '../../stores/cart-store.js';
import { aCart, aCartLine, aUser, bodiesSentTo, calledUrls, renderRoute, stubApi } from '../../test-utils.jsx';
import ProductView from './ProductView.jsx';

const product = {
  id: 1,
  slug: 'midi-dress',
  title: 'Midi Dress',
  category: { name: 'Dresses', slug: 'dresses' },
  priceCents: 3999,
  ratingAvg: null,
  reviewCount: 0,
  sizingNotes: null,
  fit: null,
  length: null,
  sizeChart: null,
  images: [{ url: 'https://cdn.example/a.webp', alt: 'Front', width: 800, height: 1000 }],
  colors: ['Black', 'White'],
  sizes: ['S', 'M'],
  // Black has S. White has M only.
  variants: [
    { id: 3, color: 'Black', size: 'S', inStock: true },
    { id: 4, color: 'Black', size: 'M', inStock: false },
    { id: 5, color: 'White', size: 'S', inStock: false },
    { id: 6, color: 'White', size: 'M', inStock: true },
  ],
};

const signedOut = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };

// `user`: null is a guest. `serverLines`: the bag of a signed-in user. `put`: what setting a quantity answers.
function renderView({ user = null, serverLines = [], put } = {}) {
  const fetchMock = stubApi((url, init) => {
    if (url === '/api/auth/me') return user ? { body: { data: { user } } } : signedOut;
    if (url === '/api/cart') return { body: { data: aCart(serverLines) } };
    if (url.startsWith('/api/cart/items/') && init.method === 'PUT') {
      const { quantity } = JSON.parse(init.body);
      const variantId = Number(url.split('/').pop());
      return put ?? { body: { data: aCart([aCartLine({ variantId, quantity })]) } };
    }
    return { status: 404, body: { error: { message: 'Not found' } } };
  });
  renderRoute(<ProductView product={product} />);
  return fetchMock;
}

const chooseSize = (name) => fireEvent.click(screen.getByRole('button', { name }));
const pressAdd = () => fireEvent.click(screen.getByRole('button', { name: /Add to bag/ }));
const guestItems = () => useCartStore.getState().items;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

describe('ProductView: Add to bag', () => {
  it('adds nothing and asks for a size when none is chosen', () => {
    const fetchMock = renderView();

    pressAdd();

    expect(screen.getByRole('alert')).toHaveTextContent('Please choose a size.');
    expect(guestItems()).toEqual([]);
    expect(calledUrls(fetchMock).filter((url) => url.startsWith('/api/cart'))).toEqual([]);
  });

  it("puts a guest's choice in the browser bag, without asking the server", async () => {
    const fetchMock = renderView();
    chooseSize('S');

    pressAdd();

    const message = await screen.findByRole('status');
    expect(message).toHaveTextContent('Added to your bag.');
    expect(within(message).getByRole('link', { name: 'View bag' })).toHaveAttribute('href', '/cart');
    expect(guestItems()).toEqual([{ variantId: 3, quantity: 1 }]);
    expect(calledUrls(fetchMock).filter((url) => url.startsWith('/api/cart'))).toEqual([]);
  });

  it('adds the chosen quantity, and adds to it when pressed again', async () => {
    renderView();
    chooseSize('S');
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));

    pressAdd();
    await screen.findByRole('status');
    pressAdd();

    await vi.waitFor(() => expect(guestItems()).toEqual([{ variantId: 3, quantity: 4 }]));
  });

  it('adds the variant of the chosen color and size', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'White' }));
    chooseSize('M');

    pressAdd();

    await screen.findByRole('status');
    expect(guestItems()).toEqual([{ variantId: 6, quantity: 1 }]);
  });

  it('stops at 9 and says so', async () => {
    useCartStore.setState({ items: [{ variantId: 3, quantity: 8 }] });
    renderView();
    chooseSize('S');
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));

    pressAdd();

    expect(await screen.findByRole('status')).toHaveTextContent('at most 9');
    expect(guestItems()).toEqual([{ variantId: 3, quantity: 9 }]);
  });

  it('hides the message again when another size is chosen', async () => {
    renderView({});
    fireEvent.click(screen.getByRole('button', { name: 'White' }));
    chooseSize('M');
    pressAdd();
    await screen.findByRole('status');

    fireEvent.click(screen.getByRole('button', { name: 'Black' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('for a signed-in user, sets the quantity on the server: what is in the bag plus the new one', async () => {
    const fetchMock = renderView({
      user: aUser(),
      serverLines: [aCartLine({ variantId: 3, quantity: 2 })],
    });
    await screen.findByRole('button', { name: /Add to bag/ });
    chooseSize('S');

    pressAdd();

    expect(await screen.findByRole('status')).toHaveTextContent('Added to your bag.');
    expect(bodiesSentTo(fetchMock, '/api/cart/items/3')).toEqual([{ quantity: 3 }]);
    expect(guestItems()).toEqual([]);
  });

  it('for a signed-in user, caps at 9 and says so', async () => {
    renderView({ user: aUser(), serverLines: [aCartLine({ variantId: 3, quantity: 9 })] });
    await screen.findByRole('button', { name: /Add to bag/ });
    chooseSize('S');

    pressAdd();

    expect(await screen.findByRole('status')).toHaveTextContent('at most 9');
  });

  it('says so when the bag could not be updated, and adds nothing to the browser', async () => {
    renderView({
      user: aUser(),
      put: { status: 500, body: { error: { message: 'Something went wrong' } } },
    });
    await screen.findByRole('button', { name: /Add to bag/ });
    chooseSize('S');

    pressAdd();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not add this to your bag');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(guestItems()).toEqual([]);
  });

  describe('when the bag has 50 different lines', () => {
    // Variants 100 to 149, one each. `with3` swaps one of them for the variant on this page (id 3).
    const fullStore = ({ with3 = false } = {}) =>
      Array.from({ length: 50 }, (_, i) => ({ variantId: with3 && i === 0 ? 3 : 100 + i, quantity: 1 }));
    const fullServerBag = ({ with3 = false } = {}) =>
      fullStore({ with3 }).map(({ variantId, quantity }) => aCartLine({ variantId, quantity }));

    it('adds no new line for a guest, and says the bag is full', async () => {
      useCartStore.setState({ items: fullStore() });
      renderView();
      chooseSize('S');

      pressAdd();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your bag is full (50 items max). Remove one to add another.',
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(guestItems()).toEqual(fullStore());
    });

    it('still adds more of a line a guest already has', async () => {
      useCartStore.setState({ items: fullStore({ with3: true }) });
      renderView();
      chooseSize('S');

      pressAdd();

      expect(await screen.findByRole('status')).toHaveTextContent('Added to your bag.');
      expect(guestItems().find((item) => item.variantId === 3)).toEqual({ variantId: 3, quantity: 2 });
      expect(guestItems()).toHaveLength(50);
    });

    it('adds no new line for a signed-in user, and sends nothing', async () => {
      const fetchMock = renderView({ user: aUser(), serverLines: fullServerBag() });
      await screen.findByRole('button', { name: /Add to bag/ });
      chooseSize('S');

      pressAdd();

      expect(await screen.findByRole('alert')).toHaveTextContent('Your bag is full (50 items max)');
      expect(calledUrls(fetchMock).filter((url) => url.startsWith('/api/cart/items'))).toEqual([]);
    });

    it('still adds more of a line a signed-in user already has', async () => {
      const fetchMock = renderView({ user: aUser(), serverLines: fullServerBag({ with3: true }) });
      await screen.findByRole('button', { name: /Add to bag/ });
      chooseSize('S');

      pressAdd();

      expect(await screen.findByRole('status')).toHaveTextContent('Added to your bag.');
      expect(bodiesSentTo(fetchMock, '/api/cart/items/3')).toEqual([{ quantity: 2 }]);
    });
  });
});
