import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '../stores/cart-store.js';
import { aCart, anOrder, aUser, stubApi } from '../test-utils.jsx';
import { useLogin, useLogout, useMe, useRegister } from './use-auth.js';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

// Same cache options as the app for the 'me' query (no retries), so a test sees what a visitor would.
function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useMe', () => {
  it('is undefined while loading, then the user', async () => {
    stubApi(() => ({ body: { data: { user: aUser() } } }));
    const { wrapper } = setup();

    const { result } = renderHook(() => useMe(), { wrapper });

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual(aUser()));
  });

  it('is null for a guest (a 401 is not an error)', async () => {
    stubApi(() => ({ status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } }));
    const { wrapper } = setup();

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeNull());
    expect(result.current.isError).toBe(false);
  });

  it('does not retry when the server fails, so the pages open as a guest at once', async () => {
    const fetchMock = stubApi(() => ({ status: 500, body: { error: { message: 'Something went wrong' } } }));
    const { wrapper } = setup();

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('useLogout', () => {
  const signedIn = async (logoutAnswer) => {
    stubApi((url) => (url === '/api/auth/logout' ? logoutAnswer : { body: { data: { user: aUser() } } }));
    const { queryClient, wrapper } = setup();
    const me = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(me.result.current.data).toEqual(aUser()));
    const logout = renderHook(() => useLogout(), { wrapper });
    return { queryClient, logout, me };
  };

  it('removes the user after a successful sign out', async () => {
    const { queryClient, logout } = await signedIn({ status: 204 });

    await act(() => logout.result.current.mutateAsync());

    expect(queryClient.getQueryData(['me'])).toBeNull();
  });

  it('removes the user when the session was already over (401)', async () => {
    const { queryClient, logout } = await signedIn({
      status: 401,
      body: { error: { code: 'UNAUTHORIZED', message: 'x' } },
    });

    await act(() => logout.result.current.mutateAsync().catch(() => {}));

    expect(queryClient.getQueryData(['me'])).toBeNull();
  });

  it('keeps the user when the server fails: the cookie is still there', async () => {
    const { queryClient, logout } = await signedIn({ status: 500, body: { error: { message: 'x' } } });

    await act(() => logout.result.current.mutateAsync().catch(() => {}));

    expect(queryClient.getQueryData(['me'])).toEqual(aUser());
  });

  describe('the bag', () => {
    // A guest bag that could not be merged yet, and the signed-in user's bag in the cache.
    const withBags = (queryClient) => {
      useCartStore.setState({ items: [{ variantId: 1, quantity: 2 }] });
      queryClient.setQueryData(['cart'], aCart());
      queryClient.setQueryData(['cart', 'quote', []], aCart());
      queryClient.setQueryData(['orders', { page: 1, limit: 10 }], { items: [], total: 0 });
      queryClient.setQueryData(['order', 'LM-261025-4821'], anOrder());
    };

    it('is emptied in the browser after a successful sign out', async () => {
      const { queryClient, logout } = await signedIn({ status: 204 });
      withBags(queryClient);

      await act(() => logout.result.current.mutateAsync());

      expect(useCartStore.getState().items).toEqual([]);
      expect(queryClient.getQueryData(['cart'])).toBeUndefined();
      expect(queryClient.getQueryData(['cart', 'quote', []])).toBeUndefined();
    });

    it('takes the orders out of the cache too after a successful sign out', async () => {
      const { queryClient, logout } = await signedIn({ status: 204 });
      withBags(queryClient);

      await act(() => logout.result.current.mutateAsync());

      expect(queryClient.getQueryData(['orders', { page: 1, limit: 10 }])).toBeUndefined();
      expect(queryClient.getQueryData(['order', 'LM-261025-4821'])).toBeUndefined();
    });

    it('is emptied too when the session was already over (401)', async () => {
      const { queryClient, logout } = await signedIn({
        status: 401,
        body: { error: { code: 'UNAUTHORIZED', message: 'x' } },
      });
      withBags(queryClient);

      await act(() => logout.result.current.mutateAsync().catch(() => {}));

      expect(useCartStore.getState().items).toEqual([]);
      expect(queryClient.getQueryData(['cart'])).toBeUndefined();
    });

    it('is kept when signing out fails, because the user is still signed in', async () => {
      const { queryClient, logout } = await signedIn({ status: 500, body: { error: { message: 'x' } } });
      withBags(queryClient);

      await act(() => logout.result.current.mutateAsync().catch(() => {}));

      expect(useCartStore.getState().items).toEqual([{ variantId: 1, quantity: 2 }]);
      expect(queryClient.getQueryData(['cart'])).toEqual(aCart());
    });
  });
});

describe('signing in', () => {
  // A bag in the cache from a session that ended without a sign out.
  const staleBag = aCart([{ variantId: 1, quantity: 3 }]);

  it('drops a bag left in the cache from another user', async () => {
    stubApi(() => ({ body: { data: { user: aUser({ id: 2 }) } } }));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(['cart'], staleBag);
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'b@example.com', password: 'password123' }));

    expect(queryClient.getQueryData(['cart'])).toBeUndefined();
    expect(queryClient.getQueryData(['me'])).toEqual(aUser({ id: 2 }));
  });

  it("drops the previous user's orders from the cache, so the next user never sees them", async () => {
    stubApi(() => ({ body: { data: { user: aUser({ id: 2 }) } } }));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(['orders', { page: 1, limit: 10 }], { items: [{}], total: 1 });
    queryClient.setQueryData(['order', 'LM-261025-4821'], anOrder());
    const { result } = renderHook(() => useLogin(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'b@example.com', password: 'password123' }));

    expect(queryClient.getQueryData(['orders', { page: 1, limit: 10 }])).toBeUndefined();
    expect(queryClient.getQueryData(['order', 'LM-261025-4821'])).toBeUndefined();
  });

  it('does the same after registering', async () => {
    stubApi(() => ({ body: { data: { user: aUser({ id: 2 }) } } }));
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(['cart'], staleBag);
    const { result } = renderHook(() => useRegister(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'b@example.com' }));

    expect(queryClient.getQueryData(['cart'])).toBeUndefined();
    expect(queryClient.getQueryData(['me'])).toEqual(aUser({ id: 2 }));
  });
});
