// Pure cart rules (business-rules.md: Cart, Shipping, Guest cart and merge), so they can be unit tested
// without a database.

export const MAX_QUANTITY = 9;
export const FREE_SHIPPING_FROM_CENTS = 9700;
export const FLAT_SHIPPING_CENTS = 695;

// `ok`: enough stock. `not_enough`: some stock, but less than asked. `sold_out`: no stock, or the product is hidden.
export function lineStatus({ stock, isActive, quantity }) {
  if (!isActive || stock <= 0) return 'sold_out';
  return stock >= quantity ? 'ok' : 'not_enough';
}

export const shippingCents = (subtotalCents) =>
  subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : FLAT_SHIPPING_CENTS;

// Totals count only `ok` lines. A bag with nothing payable has no shipping either.
export function buildCart(lines) {
  const okLines = lines.filter((line) => line.status === 'ok');
  const subtotalCents = okLines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const shipping = okLines.length === 0 ? 0 : shippingCents(subtotalCents);

  return {
    lines,
    subtotalCents,
    shippingCents: shipping,
    totalCents: subtotalCents + shipping,
    canCheckout: lines.length > 0 && okLines.length === lines.length,
  };
}

// The larger quantity wins (not the sum), so sending the same items again changes nothing.
export const mergeQuantity = (existing, incoming) => Math.min(MAX_QUANTITY, Math.max(existing ?? 0, incoming));

// The same variant twice in one request becomes one item with the larger quantity, in first-seen order.
export function collapseItems(items) {
  const quantities = new Map();
  for (const { variantId, quantity } of items) {
    quantities.set(variantId, mergeQuantity(quantities.get(variantId), quantity));
  }
  return [...quantities].map(([variantId, quantity]) => ({ variantId, quantity }));
}
