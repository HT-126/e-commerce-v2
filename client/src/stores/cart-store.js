import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addQuantity } from '../lib/cart.js';

// The guest cart: only ids and quantities. Titles, prices and stock come from the server
// (`POST /api/cart/quote`), so there is nothing here that can go out of date. A signed-in user does not
// use this store, except for the moment between signing in and the merge (business-rules.md).
export const useCartStore = create(
  persist(
    (set) => ({
      items: [],

      // Adding a variant that is already there adds to its quantity, like the account cart does.
      add: (variantId, quantity) =>
        set(({ items }) => {
          const line = items.find((item) => item.variantId === variantId);
          if (!line) return { items: [...items, { variantId, quantity: addQuantity(0, quantity) }] };
          return {
            items: items.map((item) =>
              item.variantId === variantId ? { ...item, quantity: addQuantity(item.quantity, quantity) } : item,
            ),
          };
        }),

      setQuantity: (variantId, quantity) =>
        set(({ items }) => ({
          items: items.map((item) => (item.variantId === variantId ? { ...item, quantity } : item)),
        })),

      remove: (variantId) =>
        set(({ items }) => ({ items: items.filter((item) => item.variantId !== variantId) })),

      clear: () => set({ items: [] }),
    }),
    // Only the items are saved, not the functions.
    { name: 'lumiere-cart', partialize: ({ items }) => ({ items }) },
  ),
);
