import { useQuery } from '@tanstack/react-query';
import { getCategories, getProduct, getProducts, getRelatedProducts } from '../services/catalog.js';

const FIVE_MINUTES = 5 * 60 * 1000;

// A missing product (404) is final, so do not retry it.
const retryUnlessNotFound = (count, error) => error.status !== 404 && count < 2;

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: FIVE_MINUTES });

const withoutPage = (params) => JSON.stringify({ ...params, page: 0 });

// `keepPrevious`: while the next page loads, keep showing the current one (shop paging).
// Only when the page is the one thing that changed, so a new filter never shows the old list.
export const useProducts = (params, { keepPrevious = false } = {}) =>
  useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    placeholderData: keepPrevious
      ? (previous, previousQuery) =>
          previousQuery && withoutPage(previousQuery.queryKey[1]) === withoutPage(params)
            ? previous
            : undefined
      : undefined,
  });

export const useProduct = (slug) =>
  useQuery({ queryKey: ['product', slug], queryFn: () => getProduct(slug), retry: retryUnlessNotFound });

export const useRelatedProducts = (slug) =>
  useQuery({
    queryKey: ['product', slug, 'related'],
    queryFn: () => getRelatedProducts(slug),
    retry: retryUnlessNotFound,
  });
