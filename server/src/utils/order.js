// Pure order helpers (business-rules.md: Orders, Inventory), so they can be unit tested without a database.

// `LM-` + date `YYMMDD` + `-` + 4 random digits, for example `LM-261025-4821`. The date is UTC.
export function buildOrderNumber(now, random = Math.random) {
  const date = now.toISOString().slice(2, 10).replaceAll('-', '');
  const digits = String(Math.floor(random() * 10000)).padStart(4, '0');
  return `LM-${date}-${digits}`;
}

// Stock is taken in this fixed order, lowest variant id first, so two orders can never wait on each other.
export const sortByVariant = (lines) => [...lines].sort((a, b) => a.variantId - b.variantId);

// What an order may become next (business-rules.md: Orders). Only `paid` can be cancelled, so an order that
// was delivered never loses the purchase behind a review.
const NEXT_STATUSES = {
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const allowedStatuses = (status) => NEXT_STATUSES[status] ?? [];
