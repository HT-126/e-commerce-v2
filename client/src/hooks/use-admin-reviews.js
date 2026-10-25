import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAdminReview, getAdminReviews } from '../services/admin.js';

export const useAdminReviews = (params) =>
  useQuery({
    queryKey: ['admin', 'reviews', params],
    queryFn: () => getAdminReviews(params),
    placeholderData: keepPreviousData,
    retry: false,
  });

// Deleting a review changes the product's shown rating, so the shop's product data is asked for again.
export function useDeleteAdminReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
