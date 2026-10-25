import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CART_KEY } from '../lib/cart.js';
import { ORDER_KEY, ORDERS_KEY } from '../lib/orders.js';
import { getOrder, getOrders, placeOrder } from '../services/orders.js';

// Whatever the answer, the bag changed: it is empty after an order, and after a refused one the
// lines show their new status (`not_enough` or `sold_out`).
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: (order) => {
      queryClient.setQueryData([...ORDER_KEY, order.orderNumber], order);
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
    },
    // Not returned, so paying does not wait for the bag to reload: the confirmation opens at once instead
    // of flashing an empty bag first.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
    },
  });
}

// While the next page loads, the current one stays on screen.
export const useOrders = ({ page, limit }) =>
  useQuery({
    queryKey: [...ORDERS_KEY, { page, limit }],
    queryFn: () => getOrders({ page, limit }),
    placeholderData: keepPreviousData,
    retry: false,
  });

// An unknown order (404) is final, so do not retry it.
export const useOrder = (orderNumber) =>
  useQuery({
    queryKey: [...ORDER_KEY, orderNumber],
    queryFn: () => getOrder(orderNumber),
    retry: (count, error) => error.status !== 404 && count < 2,
  });
