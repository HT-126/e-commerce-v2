import { useId, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import Button from '../../components/Button.jsx';
import Pagination from '../../components/Pagination.jsx';
import RatingStars from '../../components/RatingStars.jsx';
import StarRatingInput from '../../components/StarRatingInput.jsx';
import { useMe } from '../../hooks/use-auth.js';
import { useDeleteReview, useMyReview, useReviews, useSaveReview } from '../../hooks/use-reviews.js';
import { ApiError } from '../../lib/api.js';
import { formatDate } from '../../lib/format-date.js';
import { REVIEW_MAX_LENGTH } from '../../lib/reviews.js';

const LIMIT = 10;
const MAX_PAGE = 10000;
const NOT_BOUGHT = 'Only customers who bought this item can review it.';

function saveErrorMessage(error) {
  if (error instanceof ApiError && error.code === 'NOT_PURCHASED') return NOT_BOUGHT;
  if (error instanceof ApiError && error.status === 400) return 'Please check your review and try again.';
  return 'Could not save your review. Please try again.';
}

// Write or edit. A simple form, so the browser limits the comment; the server checks everything again.
function ReviewForm({ slug, initial, onDone }) {
  const commentId = useId();
  const save = useSaveReview(slug);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [ratingMissing, setRatingMissing] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!rating) {
      setRatingMissing(true);
      return;
    }
    try {
      await save.mutateAsync({ rating, comment: comment.trim() || null });
      onDone();
    } catch {
      // The message is shown under the form (`save.error`).
    }
  }

  return (
    <form onSubmit={submit} aria-label={initial ? 'Edit your review' : 'Write a review'} className="space-y-4">
      <StarRatingInput
        value={rating}
        onChange={(next) => {
          setRating(next);
          setRatingMissing(false);
        }}
      />
      {ratingMissing && (
        <p role="alert" className="text-sm text-error">
          Please choose a rating.
        </p>
      )}

      <div>
        <label htmlFor={commentId} className="block text-sm font-medium">
          Comment <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <textarea
          id={commentId}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={REVIEW_MAX_LENGTH}
          rows={4}
          className="mt-2 w-full rounded-[20px] border border-highlight bg-white px-5 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <p className="mt-1 px-2 text-right text-xs text-ink-soft">
          {comment.length}/{REVIEW_MAX_LENGTH}
        </p>
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-error">
          {saveErrorMessage(save.error)}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save review'}
        </Button>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// What the visitor can do: sign in, nothing (did not buy), write a review, or see and change their own.
function MyReview({ slug }) {
  const location = useLocation();
  const { data: user, isPending: userLoading } = useMe();
  const mine = useMyReview(slug);
  const remove = useDeleteReview(slug);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (userLoading) return null;
  if (!user) {
    return (
      <p className="text-sm">
        {NOT_BOUGHT}{' '}
        <Link
          to="/login"
          state={{ from: location.pathname + location.search }}
          className="font-medium underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    );
  }
  if (mine.isPending) return <p className="text-sm text-ink-soft">Loading...</p>;
  if (mine.isError) {
    return (
      <div role="alert" className="text-sm">
        <p className="text-error">Could not load your review.</p>
        <Button variant="outline" className="mt-3" onClick={() => mine.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { review, canReview } = mine.data;
  if (editing) return <ReviewForm slug={slug} initial={review} onDone={() => setEditing(false)} />;

  if (review) {
    return (
      <div>
        <h3 className="font-serif text-xl">Your review</h3>
        <div className="mt-2 flex items-center gap-3">
          <RatingStars rating={review.rating} />
          <span className="text-sm text-ink-soft">{formatDate(review.createdAt)}</span>
        </div>
        {review.comment && <p className="mt-2 text-sm leading-relaxed">{review.comment}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {canReview && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {confirming ? (
            <>
              <span className="text-sm">Delete your review?</span>
              <Button
                disabled={remove.isPending}
                onClick={() => remove.mutate(undefined, { onSuccess: () => setConfirming(false) })}
              >
                Yes, delete
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          )}
        </div>
        {remove.isError && (
          <p role="alert" className="mt-2 text-sm text-error">
            Could not delete your review. Please try again.
          </p>
        )}
      </div>
    );
  }

  if (canReview) return <Button onClick={() => setEditing(true)}>Write a review</Button>;
  return <p className="text-sm">{NOT_BOUGHT}</p>;
}

// Only reviews with a comment are listed; the page is in the URL (`?reviewPage=2`).
function ReviewList({ slug }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(searchParams.get('reviewPage') ?? '1', 10) || 1));
  const { data, isPending, isError, refetch, isPlaceholderData } = useReviews(slug, { page, limit: LIMIT });
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  // The product page stays where it is when the page of reviews changes.
  function goToPage(next) {
    const target = Math.min(next, Math.max(totalPages, 1));
    const params = new URLSearchParams(searchParams);
    if (target > 1) params.set('reviewPage', String(target));
    else params.delete('reviewPage');
    setSearchParams(params, { preventScrollReset: true });
  }

  if (isPending) {
    return (
      <div role="status" aria-label="Loading reviews" className="animate-pulse space-y-3">
        <div className="h-16 rounded-[20px] bg-card" />
        <div className="h-16 rounded-[20px] bg-card" />
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="text-sm">
        <p className="text-error">Could not load the reviews.</p>
        <Button variant="outline" className="mt-3" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (data.items.length === 0 && page === 1) {
    return <p className="text-sm text-ink-soft">No written reviews yet.</p>;
  }

  return (
    <>
      <ul aria-busy={isPlaceholderData} className="divide-y divide-border">
        {data.items.map((review) => (
          <li key={review.id} className="py-5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <RatingStars rating={review.rating} />
              <span className="text-sm font-medium">{review.authorName}</span>
              <span className="text-sm text-ink-soft">{formatDate(review.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{review.comment}</p>
          </li>
        ))}
      </ul>
      {/* A page past the end (typed in the URL) still gets a way back: Previous jumps to the last page. */}
      <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
    </>
  );
}

export default function ReviewsSection({ slug }) {
  return (
    <section aria-label="Reviews" className="mt-6 space-y-6 rounded-[28px] bg-white p-8">
      <div className="border-b border-border pb-6 empty:hidden">
        <MyReview slug={slug} />
      </div>
      <ReviewList slug={slug} />
    </section>
  );
}
