import { api } from '../lib/api.js';
import { buildQuery } from '../lib/query-string.js';

// Orders
export const getAdminOrders = (params) => api(`/admin/orders${buildQuery(params)}`);
export const getAdminOrder = (orderNumber) => api(`/admin/orders/${encodeURIComponent(orderNumber)}`);
export const changeOrderStatus = (orderNumber, status) =>
  api(`/admin/orders/${encodeURIComponent(orderNumber)}`, { method: 'PATCH', body: { status } });

// Reviews
export const getAdminReviews = (params) => api(`/admin/reviews${buildQuery(params)}`);
export const deleteAdminReview = (id) => api(`/admin/reviews/${id}`, { method: 'DELETE' });

// Products and variants
export const getAdminProducts = (params) => api(`/admin/products${buildQuery(params)}`);
export const getAdminProduct = (id) => api(`/admin/products/${id}`);
export const createAdminProduct = (product) => api('/admin/products', { method: 'POST', body: product });
export const updateAdminProduct = (id, changes) =>
  api(`/admin/products/${id}`, { method: 'PATCH', body: changes });
export const createAdminVariant = (productId, variant) =>
  api(`/admin/products/${productId}/variants`, { method: 'POST', body: variant });
export const updateAdminVariant = (id, changes) =>
  api(`/admin/variants/${id}`, { method: 'PATCH', body: changes });
