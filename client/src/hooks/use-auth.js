import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api.js';
import { CART_KEY } from '../lib/cart.js';
import { ORDER_KEY, ORDERS_KEY } from '../lib/orders.js';
import { MY_REVIEW_KEY } from '../lib/reviews.js';
import { getMe, login, logout, register } from '../services/auth.js';
import { useCartStore } from '../stores/cart-store.js';

const ME = ['me'];

// Who is signed in lives in TanStack Query (it is server data), never in a second copy.
// `data` is the user, `null` for a guest, and `undefined` while it is still loading.
// No retries: if the server cannot be reached the pages should open as a guest at once, not wait.
export const useMe = () => useQuery({ queryKey: ME, queryFn: getMe, staleTime: 60 * 1000, retry: false });

// The bag, the orders and the user's own reviews belong to one user, so none of it may stay in the cache
// for the next one.
function forgetAccountData(queryClient) {
  for (const queryKey of [CART_KEY, ORDERS_KEY, ORDER_KEY, MY_REVIEW_KEY]) {
    queryClient.removeQueries({ queryKey });
  }
}

// Signing in or registering puts the user straight into the cache, so the header changes at once.
// Anything left in the cache belongs to someone else (a session that ended without a sign out), so it goes.
function signedIn(queryClient, user) {
  forgetAccountData(queryClient);
  queryClient.setQueryData(ME, user);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: login, onSuccess: (user) => signedIn(queryClient, user) });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: register, onSuccess: (user) => signedIn(queryClient, user) });
}

// Signing out empties the bag in the browser. The account bag and orders stay on the server.
function signedOut(queryClient) {
  queryClient.setQueryData(ME, null);
  useCartStore.getState().clear();
  forgetAccountData(queryClient);
}

// Signed out when the server says so, or when the session was already over (a 401). Any other failure
// (a server error, no network) leaves the cookie in place, so the user stays signed in and can try again.
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => signedOut(queryClient),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) signedOut(queryClient);
    },
  });
}
