import { api } from '../lib/api.js';

const base = (slug) => `/products/${encodeURIComponent(slug)}/reviews`;

export const getReviews = (slug, { page, limit }) => api(`${base(slug)}?page=${page}&limit=${limit}`);

// `{ review, canReview }` for the signed-in user.
export const getMyReview = (slug) => api(`${base(slug)}/mine`);

// Creates or updates the user's review. Answers with the review and the new shown rating.
export const saveMyReview = (slug, { rating, comment }) =>
  api(`${base(slug)}/mine`, { method: 'PUT', body: { rating, comment } });

export const deleteMyReview = (slug) => api(`${base(slug)}/mine`, { method: 'DELETE' });
