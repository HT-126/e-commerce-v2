import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, stubApi } from '../test-utils.jsx';
import { useLogout, useMe } from './use-auth.js';

afterEach(() => vi.unstubAllGlobals());

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
});
