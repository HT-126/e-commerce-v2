import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { ApiError } from '../lib/api.js';
import { CART_KEY, MAX_LINES, MAX_QUANTITY, addQuantity, countUnits } from '../lib/cart.js';
import { getCart, mergeCart, quoteCart, removeCartItem, setCartItem } from '../services/cart.js';
import { useCartStore } from '../stores/cart-store.js';
import { useMe } from './use-auth.js';

const EMPTY_CART = { lines: [], subtotalCents: 0, shippingCents: 0, totalCents: 0, canCheckout: false };

// A signed-in user's bag is server data. A guest's bag is the store (ids and quantities), priced by the server.
const useAccountCart = (enabled) =>
  useQuery({ queryKey: CART_KEY, queryFn: getCart, enabled, retry: false });

// While a quote reloads after a change, the lines show what the store says, so a quick second click
// starts from the right number and a removed line goes at once. Only the totals lag for a moment.
function withStoredQuantities(cart, items) {
  const stored = new Map(items.map((item) => [item.variantId, item.quantity]));
  const lines = cart.lines
    .filter((line) => stored.has(line.variantId))
    .map((line) => ({ ...line, quantity: stored.get(line.variantId) }));
  return { ...cart, lines };
}

// The same `cart` shape (api.md) for a guest and for a signed-in user.
export function useCart() {
  const { data: user, isPending: userLoading } = useMe();
  const items = useCartStore((state) => state.items);
  const isGuest = !userLoading && !user;
  const account = useAccountCart(Boolean(user));
  const quote = useQuery({
    queryKey: [...CART_KEY, 'quote', items],
    queryFn: () => quoteCart(items),
    enabled: isGuest && items.length > 0,
    placeholderData: keepPreviousData,
    retry: false,
  });

  // The quote leaves out variants the server no longer knows. They could never be shown or removed, yet
  // they would still count on the Bag icon, so they are dropped from the browser bag.
  useEffect(() => {
    if (!isGuest || !quote.isSuccess || quote.isPlaceholderData) return;
    const known = new Set(quote.data.lines.map((line) => line.variantId));
    for (const { variantId } of items) {
      if (!known.has(variantId)) useCartStore.getState().remove(variantId);
    }
  }, [isGuest, quote.isSuccess, quote.isPlaceholderData, quote.data, items]);

  if (userLoading) return { cart: undefined, isLoading: true, isError: false, isGuest: false };
  if (user) {
    return {
      cart: account.data,
      isLoading: account.isPending,
      isError: account.isError,
      error: account.error,
      refetch: account.refetch,
      isGuest: false,
    };
  }
  if (items.length === 0) return { cart: EMPTY_CART, isLoading: false, isError: false, isGuest: true };
  return {
    cart: quote.data && withStoredQuantities(quote.data, items),
    isLoading: quote.isPending,
    isError: quote.isError,
    error: quote.error,
    refetch: quote.refetch,
    isGuest: true,
  };
}

// The number on the Bag icon: units, not lines. A guest's number comes from the store alone (no request).
export function useCartCount() {
  const { data: user, isPending } = useMe();
  const guestCount = useCartStore((state) => countUnits(state.items));
  const account = useAccountCart(Boolean(user));

  if (isPending) return 0;
  if (user) return account.data ? countUnits(account.data.lines) : 0;
  return guestCount;
}

// A guest changes the store. A signed-in user changes the server, which answers with the whole cart.
function useCartMutation(guestAction, accountAction) {
  const queryClient = useQueryClient();
  const { data: user } = useMe();
  return useMutation({
    mutationFn: (args) => (user ? accountAction(args) : guestAction(args)),
    onSuccess: (cart) => {
      if (user) queryClient.setQueryData(CART_KEY, cart);
    },
  });
}

export const useSetQuantity = () =>
  useCartMutation(
    ({ variantId, quantity }) => useCartStore.getState().setQuantity(variantId, quantity),
    ({ variantId, quantity }) => setCartItem(variantId, quantity),
  );

export const useRemoveLine = () =>
  useCartMutation(
    ({ variantId }) => useCartStore.getState().remove(variantId),
    ({ variantId }) => removeCartItem(variantId),
  );

// Adds to the quantity already in the bag. Resolves `{ capped }`: true when 9 was the limit.
// Resolves `{ full: true }` and adds nothing when the bag has 50 lines and this would be a new one.
export function useAddToBag() {
  const queryClient = useQueryClient();
  const { data: user } = useMe();

  return useMutation({
    mutationFn: async ({ variantId, quantity }) => {
      if (!user) {
        const { items, add } = useCartStore.getState();
        const current = items.find((item) => item.variantId === variantId)?.quantity ?? 0;
        if (current === 0 && items.length >= MAX_LINES) return { full: true };
        add(variantId, quantity);
        return { capped: current + quantity > MAX_QUANTITY };
      }

      // Ask the server for the quantity now, because the bag may have changed in another tab.
      const cart = await queryClient.fetchQuery({ queryKey: CART_KEY, queryFn: getCart, staleTime: 0 });
      const current = cart.lines.find((line) => line.variantId === variantId)?.quantity ?? 0;
      if (current === 0 && cart.lines.length >= MAX_LINES) return { full: true };
      queryClient.setQueryData(CART_KEY, await setCartItem(variantId, addQuantity(current, quantity)));
      return { capped: current + quantity > MAX_QUANTITY };
    },
  });
}

// Sends the guest bag to the account once, as soon as the user is signed in (after sign in or register).
// If the request fails the guest bag stays, and the next page load tries again (business-rules.md).
// The server keeps the larger quantity, so a repeated request cannot double anything.
export function useMergeGuestCart() {
  const queryClient = useQueryClient();
  const { data: user } = useMe();
  const items = useCartStore((state) => state.items);
  const asked = useRef(false);
  const { mutate } = useMutation({
    mutationFn: mergeCart,
    onSuccess: () => {
      useCartStore.getState().clear();
      return queryClient.invalidateQueries({ queryKey: CART_KEY });
    },
    // A 400 means the server will never accept this bag (too many lines or a bad value), so keeping it
    // would only repeat the same failure on every page load. Any other failure may pass, so the bag stays.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) useCartStore.getState().clear();
    },
  });

  const signedIn = Boolean(user);
  useEffect(() => {
    if (!signedIn) {
      asked.current = false;
      return;
    }
    if (asked.current || items.length === 0) return;
    asked.current = true;
    mutate(items);
  }, [signedIn, items, mutate]);
}
