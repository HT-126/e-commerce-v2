import { api } from '../lib/api.js';

// Prices a guest cart (no sign in needed).
export const quoteCart = (items) => api('/cart/quote', { method: 'POST', body: { items } });

export const getCart = () => api('/cart');

export const setCartItem = (variantId, quantity) =>
  api(`/cart/items/${variantId}`, { method: 'PUT', body: { quantity } });

export const removeCartItem = (variantId) => api(`/cart/items/${variantId}`, { method: 'DELETE' });

// Sends the guest items to the account cart, once, right after sign in or register.
export const mergeCart = (items) => api('/cart/merge', { method: 'POST', body: { items } });
