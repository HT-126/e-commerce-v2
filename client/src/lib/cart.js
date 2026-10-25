// Shared by the guest cart store and the cart hooks.

// Quantity per cart line is 1 to 9 (business-rules.md).
export const MAX_QUANTITY = 9;

// The TanStack Query key for everything cart related, so one `removeQueries` clears it all.
export const CART_KEY = ['cart'];

export const addQuantity = (current, extra) => Math.min(MAX_QUANTITY, current + extra);

// Works for guest items and for cart lines: both have a `quantity`.
export const countUnits = (items) => items.reduce((sum, item) => sum + item.quantity, 0);
