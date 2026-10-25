import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MY_REVIEW_KEY } from '../lib/reviews.js';
import { deleteMyReview, getMyReview, getReviews, saveMyReview } from '../services/reviews.js';
import { useMe } from './use-auth.js';

// While the next page loads, the current one stays on screen.
export const useReviews = (slug, { page, limit }) =>
  useQuery({
    queryKey: ['reviews', slug, { page, limit }],
    queryFn: () => getReviews(slug, { page, limit }),
    placeholderData: keepPreviousData,
    retry: false,
  });

// The user's own review and whether they may write one. Only asked for a signed-in user.
export function useMyReview(slug) {
  const { data: user } = useMe();
  return useQuery({
    queryKey: [...MY_REVIEW_KEY, slug],
    queryFn: () => getMyReview(slug),
    enabled: Boolean(user),
    retry: false,
  });
}

// A saved or deleted review changes the list, the user's own review, and the rating the product page and
// the product cards show, so all of them are asked for again.
function useReviewMutation(slug, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reviews', slug] }),
        queryClient.invalidateQueries({ queryKey: [...MY_REVIEW_KEY, slug] }),
        queryClient.invalidateQueries({ queryKey: ['product', slug] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]),
  });
}

export const useSaveReview = (slug) => useReviewMutation(slug, (review) => saveMyReview(slug, review));

export const useDeleteReview = (slug) => useReviewMutation(slug, () => deleteMyReview(slug));
