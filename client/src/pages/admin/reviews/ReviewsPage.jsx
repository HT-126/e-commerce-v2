import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import DataTable from '@/components/admin/DataTable';
import { Button } from '@/components/ui/button';
import RatingStars from '../../../components/RatingStars.jsx';
import { useAdminReviews, useDeleteAdminReview } from '../../../hooks/use-admin-reviews.js';
import { formatDate } from '../../../lib/format-date.js';
import { useListParams } from '../use-list-params.js';

const LIMIT = 20;

export default function ReviewsPage() {
  const { page, get, update } = useListParams();
  const productId = get('productId');
  const { data, isPending, isError, refetch } = useAdminReviews({ productId, page, limit: LIMIT });
  const remove = useDeleteAdminReview();
  const [target, setTarget] = useState(null);

  // Stable, because the table needs stable columns. `setTarget` never changes.
  const columns = useMemo(
    () => [
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <Link to={`/products/${row.original.product.slug}`} className="underline-offset-4 hover:underline">
            {row.original.product.title}
          </Link>
        ),
      },
      { id: 'user', header: 'Customer', cell: ({ row }) => row.original.user.email },
      { id: 'rating', header: 'Rating', cell: ({ row }) => <RatingStars rating={row.original.rating} /> },
      {
        id: 'comment',
        header: 'Comment',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-sm break-words whitespace-pre-line">
            {row.original.comment ?? <span className="text-muted-foreground">Rating only</span>}
          </span>
        ),
      },
      { id: 'createdAt', header: 'Date', cell: ({ row }) => formatDate(row.original.createdAt) },
      {
        id: 'actions',
        header: <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Delete the review by ${row.original.user.email}`}
            onClick={() => setTarget(row.original)}
          >
            Delete
          </Button>
        ),
      },
    ],
    [],
  );

  async function confirmDelete() {
    try {
      await remove.mutateAsync(target.id);
      toast.success('Review deleted');
    } catch {
      toast.error('Could not delete the review. Please try again.');
    } finally {
      setTarget(null);
    }
  }

  return (
    <section>
      <h1 className="font-serif text-3xl">Reviews</h1>
      {productId && (
        <p className="mt-4 text-sm text-muted-foreground">
          Showing the reviews of one product.{' '}
          <button
            type="button"
            onClick={() => update({ productId: '' })}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Show all reviews
          </button>
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={data?.items}
          total={data?.total}
          page={page}
          limit={LIMIT}
          onPageChange={(next) => update({ page: next })}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="No reviews yet."
        />
      </div>

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Delete this review?"
        description="It disappears from the product page and the product's rating is worked out again. The customer can write a new one."
        confirmLabel="Yes, delete review"
        cancelLabel="Keep review"
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
