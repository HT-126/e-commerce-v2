import { api } from '../lib/api.js';

// "Pay": places an order from the signed-in user's bag.
export const placeOrder = () => api('/orders', { method: 'POST' });

export const getOrders = ({ page, limit }) => api(`/orders?page=${page}&limit=${limit}`);

export const getOrder = (orderNumber) => api(`/orders/${encodeURIComponent(orderNumber)}`);
