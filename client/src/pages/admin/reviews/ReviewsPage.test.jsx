import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { calledUrls, renderRoute, stubApi } from '../../../test-utils.jsx';
import ReviewsPage from './ReviewsPage.jsx';

afterEach(() => {
  vi.unstubAllGlobals();
  // Toasts live in one shared store, so one test's toast would still be on screen in the next.
  toast.dismiss();
});

const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };

const review = (overrides = {}) => ({
  id: 1,
  rating: 5,
  comment: 'Lovely dress',
  createdAt: '2026-10-20T12:00:00.000Z',
  product: { slug: 'blue-dress', title: 'Blue Dress' },
  user: { email: 'anna@example.com' },
  ...overrides,
});

// A fake API with a list that loses a review when it is deleted. `del`: an answer to use instead.
function renderReviews({ items = [review()], total = items.length, del, url = '/admin/reviews' } = {}) {
  let current = items;
  let count = total;
  const fetchMock = stubApi((requested, init) => {
    if (init?.method === 'DELETE') {
      if (del) return del;
      const id = Number(requested.split('/').pop());
      current = current.filter((item) => item.id !== id);
      count -= 1;
      return { status: 204 };
    }
    return { body: { data: { items: current, page: 1, limit: 20, total: count } } };
  });
  renderRoute(
    <>
      <ReviewsPage />
      <Toaster />
    </>,
    { path: '/admin/reviews', url },
  );
  return fetchMock;
}
const deletes = (fetchMock) => fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE');

describe('admin ReviewsPage', () => {
  it('shows a loading state first', () => {
    renderReviews();

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('lists each review with its product, customer, rating, comment and date', async () => {
    renderReviews({
      items: [review(), review({ id: 2, rating: 2, comment: null, user: { email: 'ben@example.com' } })],
    });

    const [link] = await screen.findAllByRole('link', { name: 'Blue Dress' });
    expect(link).toHaveAttribute('href', '/products/blue-dress');
    const first = screen.getByText('anna@example.com').closest('tr');
    expect(within(first).getByRole('img', { name: 'Rated 5 out of 5' })).toBeInTheDocument();
    expect(within(first).getByText('Lovely dress')).toBeInTheDocument();
    expect(within(first).getByText('Oct 20, 2026')).toBeInTheDocument();
    const second = screen.getByText('ben@example.com').closest('tr');
    expect(within(second).getByText('Rating only')).toBeInTheDocument();
  });

  it('asks the API for the page in the URL and for one product', async () => {
    const fetchMock = renderReviews({ items: [review()], total: 45, url: '/admin/reviews?productId=7&page=2' });
    await screen.findByText('anna@example.com');

    expect(calledUrls(fetchMock)).toContain('/api/admin/reviews?productId=7&page=2&limit=20');
    expect(screen.getByText('Showing the reviews of one product.')).toBeInTheDocument();
  });

  it('shows all reviews again from the one-product view', async () => {
    const fetchMock = renderReviews({ url: '/admin/reviews?productId=7' });
    await screen.findByText('anna@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Show all reviews' }));

    await waitFor(() => expect(calledUrls(fetchMock).at(-1)).toBe('/api/admin/reviews?page=1&limit=20'));
    expect(screen.queryByText('Showing the reviews of one product.')).not.toBeInTheDocument();
  });

  it('asks for the next page', async () => {
    const fetchMock = renderReviews({ items: [review()], total: 45 });
    await screen.findByText('anna@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(calledUrls(fetchMock).at(-1)).toBe('/api/admin/reviews?page=2&limit=20'));
  });

  it('says there are no reviews', async () => {
    renderReviews({ items: [] });

    expect(await screen.findByText('No reviews yet.')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    stubApi(() => failure);
    renderRoute(<ReviewsPage />, { path: '/admin/reviews', url: '/admin/reviews' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this list.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  describe('deleting', () => {
    it('asks first, and "Keep review" deletes nothing', async () => {
      const fetchMock = renderReviews();
      fireEvent.click(await screen.findByRole('button', { name: 'Delete the review by anna@example.com' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Delete this review?')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Keep review' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(deletes(fetchMock)).toEqual([]);
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    });

    it('deletes after "Yes, delete review", says so in a toast and the review leaves the list', async () => {
      const fetchMock = renderReviews({ items: [review(), review({ id: 2, user: { email: 'ben@example.com' } })] });
      fireEvent.click(await screen.findByRole('button', { name: 'Delete the review by anna@example.com' }));

      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, delete review' }));

      expect(await screen.findByText('Review deleted')).toBeInTheDocument();
      expect(deletes(fetchMock)[0][0]).toBe('/api/admin/reviews/1');
      await waitFor(() => expect(screen.queryByText('anna@example.com')).not.toBeInTheDocument());
      expect(screen.getByText('ben@example.com')).toBeInTheDocument();
    });

    it('says so in a toast when deleting fails, and keeps the review', async () => {
      renderReviews({ del: failure });
      fireEvent.click(await screen.findByRole('button', { name: 'Delete the review by anna@example.com' }));

      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, delete review' }));

      expect(await screen.findByText('Could not delete the review. Please try again.')).toBeInTheDocument();
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    });
  });
});
