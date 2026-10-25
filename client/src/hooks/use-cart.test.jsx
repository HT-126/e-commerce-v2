import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '../stores/cart-store.js';
import { aCart, aCartLine, aUser, bodiesSentTo, calledUrls, stubApi } from '../test-utils.jsx';
import { useCart, useMergeGuestCart } from './use-cart.js';

const signedOut = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };
const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };
const guestItems = [
  { variantId: 1, quantity: 2 },
  { variantId: 2, quantity: 1 },
];

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

// `user` null: a guest. `merge`: what the merge request answers.
function setup({ user = null, merge } = {}) {
  const merged = aCart([aCartLine({ variantId: 1, quantity: 2 }), aCartLine({ variantId: 2, quantity: 1 })]);
  const fetchMock = stubApi((url) => {
    if (url === '/api/auth/me') return user ? { body: { data: { user } } } : signedOut;
    if (url === '/api/cart/merge') return merge ?? { body: { data: merged } };
    if (url === '/api/cart') return { body: { data: merged } };
    return { status: 404, body: { error: { message: 'Not found' } } };
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { fetchMock, queryClient, wrapper };
}

const mergeRequests = (fetchMock) => calledUrls(fetchMock).filter((url) => url === '/api/cart/merge');

describe('useMergeGuestCart', () => {
  it('sends the guest bag once the user is signed in, then empties the browser bag', async () => {
    useCartStore.setState({ items: guestItems });
    const { fetchMock, wrapper } = setup({ user: aUser() });

    renderHook(() => useMergeGuestCart(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(bodiesSentTo(fetchMock, '/api/cart/merge')).toEqual([{ items: guestItems }]);
  });

  it('asks the server for the account bag again after the merge', async () => {
    useCartStore.setState({ items: guestItems });
    const { fetchMock, wrapper } = setup({ user: aUser() });

    // The cart hook is mounted too, like the Cart page, so the bag is an active query.
    const { result } = renderHook(
      () => {
        useMergeGuestCart();
        return useCart();
      },
      { wrapper },
    );

    await waitFor(() => expect(result.current.cart?.lines).toHaveLength(2));
    expect(calledUrls(fetchMock)).toContain('/api/cart');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('sends nothing to a guest, and keeps the browser bag', async () => {
    useCartStore.setState({ items: guestItems });
    const { fetchMock, wrapper } = setup();

    renderHook(() => useMergeGuestCart(), { wrapper });
    await waitFor(() => expect(calledUrls(fetchMock)).toContain('/api/auth/me'));
    await act(async () => {});

    expect(mergeRequests(fetchMock)).toEqual([]);
    expect(useCartStore.getState().items).toEqual(guestItems);
  });

  it('sends nothing when the browser bag is empty', async () => {
    const { fetchMock, wrapper } = setup({ user: aUser() });

    renderHook(() => useMergeGuestCart(), { wrapper });
    await waitFor(() => expect(calledUrls(fetchMock)).toContain('/api/auth/me'));
    await act(async () => {});

    expect(mergeRequests(fetchMock)).toEqual([]);
  });

  it('keeps the browser bag when the merge fails, and does not try again until the next page load', async () => {
    useCartStore.setState({ items: guestItems });
    const { fetchMock, wrapper } = setup({ user: aUser(), merge: failure });

    const { rerender } = renderHook(() => useMergeGuestCart(), { wrapper });
    await waitFor(() => expect(mergeRequests(fetchMock)).toHaveLength(1));
    await act(async () => {});
    rerender();

    expect(useCartStore.getState().items).toEqual(guestItems);
    expect(mergeRequests(fetchMock)).toHaveLength(1);
  });

  it('empties the browser bag when the server refuses it with a 400, because trying again cannot help', async () => {
    useCartStore.setState({ items: guestItems });
    const refused = { status: 400, body: { error: { message: 'Invalid input', code: 'VALIDATION_ERROR' } } };
    const { fetchMock, wrapper } = setup({ user: aUser(), merge: refused });

    renderHook(() => useMergeGuestCart(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(mergeRequests(fetchMock)).toHaveLength(1);
  });

  it('tries again on the next page load, which is a new mount', async () => {
    useCartStore.setState({ items: guestItems });
    const first = setup({ user: aUser(), merge: failure });
    const { unmount } = renderHook(() => useMergeGuestCart(), { wrapper: first.wrapper });
    await waitFor(() => expect(mergeRequests(first.fetchMock)).toHaveLength(1));
    await act(async () => {});
    unmount();

    const second = setup({ user: aUser() });
    renderHook(() => useMergeGuestCart(), { wrapper: second.wrapper });

    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(bodiesSentTo(second.fetchMock, '/api/cart/merge')).toEqual([{ items: guestItems }]);
  });

  it('merges again when the user signs out and a later guest bag meets the next sign in', async () => {
    useCartStore.setState({ items: guestItems });
    const { fetchMock, queryClient, wrapper } = setup({ user: aUser() });
    renderHook(() => useMergeGuestCart(), { wrapper });
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));

    act(() => queryClient.setQueryData(['me'], null));
    act(() => useCartStore.setState({ items: [{ variantId: 9, quantity: 1 }] }));
    expect(mergeRequests(fetchMock)).toHaveLength(1);
    act(() => queryClient.setQueryData(['me'], aUser()));

    await waitFor(() => expect(mergeRequests(fetchMock)).toHaveLength(2));
    expect(bodiesSentTo(fetchMock, '/api/cart/merge')[1]).toEqual({ items: [{ variantId: 9, quantity: 1 }] });
  });
});

describe('useCart', () => {
  it('is an empty bag for a guest with nothing in the browser, with no request for prices', async () => {
    const { fetchMock, wrapper } = setup();

    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.cart.lines).toEqual([]);
    expect(result.current.isGuest).toBe(true);
    expect(calledUrls(fetchMock)).not.toContain('/api/cart/quote');
  });

  it('drops guest items the server does not know, so they cannot count on the Bag icon', async () => {
    useCartStore.setState({
      items: [
        { variantId: 1, quantity: 2 },
        { variantId: 99, quantity: 1 },
      ],
    });
    const { wrapper } = setup();
    // setup() stubs fetch too, so this stub goes second and replaces it.
    stubApi((url, init) => {
      if (url === '/api/auth/me') return signedOut;
      const { items } = JSON.parse(init.body);
      // The server leaves out variant 99.
      const known = items.filter((item) => item.variantId !== 99);
      return { body: { data: aCart(known.map((item) => aCartLine(item))) } };
    });

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().items).toEqual([{ variantId: 1, quantity: 2 }]));
    await waitFor(() => expect(result.current.cart.lines).toHaveLength(1));
  });

  it('loads the bag from the account for a signed-in user', async () => {
    const { wrapper } = setup({ user: aUser() });

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.cart?.lines).toHaveLength(2));
    expect(result.current.isGuest).toBe(false);
  });
});
