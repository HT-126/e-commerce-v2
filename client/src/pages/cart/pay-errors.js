import { ApiError } from '../../lib/api.js';

const NOTHING_CHARGED = 'Nothing was charged.';

// What to tell the shopper when "Pay" was refused. `items` names the lines that could not be taken.
export function describePayError(error) {
  if (error instanceof ApiError) {
    if (error.code === 'STOCK_CHANGED') {
      const items = (error.details ?? []).map(({ title, color, size }) => `${title}, ${color}, ${size}`);
      return { message: `Some items changed while you were paying. ${NOTHING_CHARGED}`, items };
    }
    if (error.code === 'CART_NOT_READY') {
      return { message: `Some items in your bag cannot be bought right now. ${NOTHING_CHARGED}`, items: [] };
    }
    if (error.code === 'CART_EMPTY') return { message: 'Your bag is empty.', items: [] };
  }
  return { message: `Could not place your order. ${NOTHING_CHARGED} Please try again.`, items: [] };
}
