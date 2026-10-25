import { api } from '../lib/api.js';

export const getCategories = () => api('/categories');

// Empty values are left out of the URL, so `?q=` never reaches the API.
export function getProducts(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const queryString = query.toString();
  return api(`/products${queryString ? `?${queryString}` : ''}`);
}

export const getFilters = () => api('/filters');

export const getProduct = (slug) => api(`/products/${encodeURIComponent(slug)}`);

export const getRelatedProducts = (slug) => api(`/products/${encodeURIComponent(slug)}/related`);
