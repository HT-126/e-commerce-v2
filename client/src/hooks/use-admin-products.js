import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminProduct,
  createAdminVariant,
  getAdminProduct,
  getAdminProducts,
  updateAdminProduct,
  updateAdminVariant,
} from '../services/admin.js';

export const useAdminProducts = (params) =>
  useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () => getAdminProducts(params),
    placeholderData: keepPreviousData,
    retry: false,
  });

// An unknown product (404) is final, so do not retry it.
export const useAdminProduct = (id, { enabled = true } = {}) =>
  useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => getAdminProduct(id),
    enabled,
    retry: (count, error) => error.status !== 404 && count < 2,
  });

// A product, a price or a stock number changed here shows in the shop at once, so the shop's own product data
// is asked for again too, and the admin's lists (their total stock and status). The shop's filter options
// (colors and sizes of active products, cached for 5 minutes) change when a product is hidden or a color or
// size is added or renamed, so they are asked for again as well.
function refreshProducts(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
  queryClient.invalidateQueries({ queryKey: ['product'] });
  queryClient.invalidateQueries({ queryKey: ['products'] });
  queryClient.invalidateQueries({ queryKey: ['filters'] });
}

// The server answers with the whole saved product, which goes straight into the cache.
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminProduct,
    onSuccess: (product) => {
      queryClient.setQueryData(['admin', 'product', String(product.id)], product);
      refreshProducts(queryClient);
    },
  });
}

export function useUpdateProduct(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes) => updateAdminProduct(id, changes),
    onSuccess: (product) => {
      queryClient.setQueryData(['admin', 'product', String(id)], product);
      refreshProducts(queryClient);
    },
  });
}

// Variants come with the product, so the product is loaded again after a change.
function useVariantMutation(productId, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', String(productId)] });
      refreshProducts(queryClient);
    },
  });
}

export const useCreateVariant = (productId) =>
  useVariantMutation(productId, (variant) => createAdminVariant(productId, variant));

export const useUpdateVariant = (productId) =>
  useVariantMutation(productId, ({ id, changes }) => updateAdminVariant(id, changes));
