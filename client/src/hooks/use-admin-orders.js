import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { changeOrderStatus, getAdminOrder, getAdminOrders } from '../services/admin.js';

// While the next page loads, the current one stays on screen.
export const useAdminOrders = (params) =>
  useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: () => getAdminOrders(params),
    placeholderData: keepPreviousData,
    retry: false,
  });

// An unknown order (404) is final, so do not retry it.
export const useAdminOrder = (orderNumber) =>
  useQuery({
    queryKey: ['admin', 'order', orderNumber],
    queryFn: () => getAdminOrder(orderNumber),
    retry: (count, error) => error.status !== 404 && count < 2,
  });

// The server answers with the changed order. A cancel gives stock back, so the shop's product data is asked
// for again too (a size may be buyable again).
export function useChangeOrderStatus(orderNumber) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status) => changeOrderStatus(orderNumber, status),
    onSuccess: (order) => {
      queryClient.setQueryData(['admin', 'order', orderNumber], order);
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
