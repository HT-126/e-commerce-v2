import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, calledUrls, renderRoute, stubApi } from '../../test-utils.jsx';
import ReviewsSection from './ReviewsSection.jsx';

afterEach(() => vi.unstubAllGlobals());

const signedOut = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };
const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };
const notPurchased = { status: 403, body: { error: { message: 'x', code: 'NOT_PURCHASED' } } };

const aReview = (overrides = {}) => ({
  id: 1,
  rating: 5,
  comment: 'Lovely dress',
  authorName: 'Anna K.',
  createdAt: '2026-10-20T12:00:00.000Z',
  ...overrides,
});
const myReview = (overrides = {}) => ({
  rating: 4,
  comment: 'Runs a little small',
  createdAt: '2026-10-21T12:00:00.000Z',
  ...overrides,
});

// A fake API for one product. `mine` is the user's review (null: none), and it changes when the user saves or
// deletes, like the real one. `list` is the page of reviews. `put` / `del`: an answer to use instead.
function renderReviews({
  user = null,
  canReview = false,
  mine = null,
  list = { items: [], total: 0 },
  listAnswer,
  mineAnswer,
  put,
  del,
  url = '/products/midi-dress',
} = {}) {
  let current = mine;
  const fetchMock = stubApi((requested, init) => {
    if (requested === '/api/auth/me') return user ? { body: { data: { user } } } : signedOut;
    if (requested.endsWith('/reviews/mine')) {
      if (init.method === 'PUT') {
        if (put) return put;
        const { rating, comment } = JSON.parse(init.body);
        current = { rating, comment, createdAt: '2026-10-25T12:00:00.000Z' };
        return { body: { data: { review: current, ratingAvg: 4.1, reviewCount: 11 } } };
      }
      if (init.method === 'DELETE') {
        if (del) return del;
        current = null;
        return { body: { data: { ratingAvg: 4.0, reviewCount: 10 } } };
      }
      return mineAnswer ?? { body: { data: { review: current, canReview } } };
    }
    if (requested.includes('/reviews?')) {
      const answer = typeof listAnswer === 'function' ? listAnswer(requested) : listAnswer;
      return answer ?? { body: { data: { ...list, page: 1, limit: 10 } } };
    }
    return { status: 404, body: { error: { message: 'Not found' } } };
  });

  function SignIn() {
    const { state } = useLocation();
    return <p data-testid="sign-in">sign in, back to {state?.from}</p>;
  }
  renderRoute(<ReviewsSection slug="midi-dress" />, {
    path: '/products/:slug',
    url,
    extraRoutes: <Route path="/login" element={<SignIn />} />,
  });
  return fetchMock;
}

const NOT_BOUGHT = 'Only customers who bought this item can review it.';
const chooseStars = (n) => fireEvent.click(screen.getByRole('radio', { name: `${n} ${n === 1 ? 'star' : 'stars'}` }));
const saveButton = () => screen.getByRole('button', { name: 'Save review' });

describe('ReviewsSection: who can review', () => {
  it('tells a guest that only buyers can review, with a link to sign in that comes back to the page', async () => {
    renderReviews();

    expect(await screen.findByText(NOT_BOUGHT, { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Sign in' }));

    expect(await screen.findByTestId('sign-in')).toHaveTextContent('back to /products/midi-dress');
  });

  it('does not ask the server about "my review" for a guest', async () => {
    const fetchMock = renderReviews();
    await screen.findByText(NOT_BOUGHT, { exact: false });

    expect(calledUrls(fetchMock).filter((url) => url.endsWith('/reviews/mine'))).toEqual([]);
  });

  it('tells a signed-in user who did not buy it, and shows no form', async () => {
    renderReviews({ user: aUser(), canReview: false });

    expect(await screen.findByText(NOT_BOUGHT)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('offers a buyer "Write a review", which opens the form', async () => {
    renderReviews({ user: aUser(), canReview: true });

    fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }));

    const form = screen.getByRole('form', { name: 'Write a review' });
    expect(within(form).getByRole('group', { name: 'Your rating' })).toBeInTheDocument();
    expect(within(form).getAllByRole('radio')).toHaveLength(5);
    expect(within(form).getByLabelText(/Comment/)).toHaveAttribute('maxlength', '1000');
    expect(screen.queryByText(NOT_BOUGHT)).not.toBeInTheDocument();
  });

  it('says so when it cannot tell whether the user may review, and lets them try again', async () => {
    renderReviews({ user: aUser(), mineAnswer: failure });

    expect(await screen.findByText('Could not load your review.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('ReviewsSection: writing a review', () => {
  async function openForm(options = {}) {
    const fetchMock = renderReviews({ user: aUser(), canReview: true, ...options });
    fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }));
    return fetchMock;
  }

  it('asks for a rating, and sends nothing without one', async () => {
    const fetchMock = await openForm();

    fireEvent.click(saveButton());

    expect(await screen.findByText('Please choose a rating.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('removes the rating message once a star is chosen', async () => {
    await openForm();
    fireEvent.click(saveButton());
    await screen.findByText('Please choose a rating.');

    chooseStars(3);

    expect(screen.queryByText('Please choose a rating.')).not.toBeInTheDocument();
  });

  it('saves the rating and the comment, then shows "Your review"', async () => {
    const fetchMock = await openForm();
    chooseStars(4);
    fireEvent.change(screen.getByLabelText(/Comment/), { target: { value: '  Runs a little small ' } });

    fireEvent.click(saveButton());

    expect(await screen.findByRole('heading', { name: 'Your review' })).toBeInTheDocument();
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(puts[0][1].body)).toEqual({ rating: 4, comment: 'Runs a little small' });
    expect(screen.getByText('Runs a little small')).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('saves a rating only, with no comment', async () => {
    const fetchMock = await openForm();
    chooseStars(5);

    fireEvent.click(saveButton());

    await screen.findByRole('heading', { name: 'Your review' });
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(puts[0][1].body)).toEqual({ rating: 5, comment: null });
  });

  it('counts the characters of the comment', async () => {
    await openForm();

    fireEvent.change(screen.getByLabelText(/Comment/), { target: { value: 'Nice' } });

    expect(screen.getByText('4/1000')).toBeInTheDocument();
  });

  it('closes the form with Cancel and sends nothing', async () => {
    const fetchMock = await openForm();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write a review' })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('disables the button while saving, so a double click sends one review', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const fetchMock = await openForm();
    const answer = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === 'PUT') await gate;
      return answer(url, init);
    });
    chooseStars(5);

    fireEvent.click(saveButton());

    expect(await screen.findByRole('button', { name: 'Saving...' })).toBeDisabled();
    release();
    await screen.findByRole('heading', { name: 'Your review' });
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
  });

  it('shows the not-bought message when the server says 403, and keeps the form', async () => {
    await openForm({ put: notPurchased });
    chooseStars(5);

    fireEvent.click(saveButton());

    expect(await within(screen.getByRole('form')).findByRole('alert')).toHaveTextContent(NOT_BOUGHT);
  });

  it('shows a plain message for any other failure, and lets the user try again', async () => {
    await openForm({ put: failure });
    chooseStars(5);

    fireEvent.click(saveButton());

    expect(await screen.findByText('Could not save your review. Please try again.')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });
});

describe('ReviewsSection: my review', () => {
  it('shows my review with its rating, date and comment, and no "Write a review"', async () => {
    renderReviews({ user: aUser(), canReview: true, mine: myReview() });

    expect(await screen.findByRole('heading', { name: 'Your review' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 4 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('Oct 21, 2026')).toBeInTheDocument();
    expect(screen.getByText('Runs a little small')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
  });

  it('opens the form with my rating and comment filled in, and saves the change', async () => {
    const fetchMock = renderReviews({ user: aUser(), canReview: true, mine: myReview() });
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));

    const form = screen.getByRole('form', { name: 'Edit your review' });
    expect(within(form).getByRole('radio', { name: '4 stars' })).toBeChecked();
    expect(within(form).getByLabelText(/Comment/)).toHaveValue('Runs a little small');
    chooseStars(2);
    fireEvent.click(saveButton());

    await screen.findByRole('heading', { name: 'Your review' });
    expect(screen.getByRole('img', { name: 'Rated 2 out of 5' })).toBeInTheDocument();
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(puts[0][1].body)).toEqual({ rating: 2, comment: 'Runs a little small' });
  });

  it('asks before deleting, and Cancel keeps the review', async () => {
    const fetchMock = renderReviews({ user: aUser(), canReview: true, mine: myReview() });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(screen.getByText('Delete your review?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Delete your review?')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('deletes the review after "Yes, delete", and offers "Write a review" again', async () => {
    const fetchMock = renderReviews({ user: aUser(), canReview: true, mine: myReview() });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByRole('button', { name: 'Write a review' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your review' })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
  });

  it('says so when deleting fails, and keeps the review', async () => {
    renderReviews({ user: aUser(), canReview: true, mine: myReview(), del: failure });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Could not delete your review. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your review' })).toBeInTheDocument();
  });

  it('removes the "could not delete" message when the user cancels', async () => {
    renderReviews({ user: aUser(), canReview: true, mine: myReview(), del: failure });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await screen.findByText('Could not delete your review. Please try again.');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Could not delete your review. Please try again.')).not.toBeInTheDocument();
  });

  it('lets a user whose purchase no longer counts delete the review, but not change it', async () => {
    renderReviews({ user: aUser(), canReview: false, mine: myReview() });

    expect(await screen.findByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});

describe('ReviewsSection: the list', () => {
  it('lists the reviews with stars, author, date and comment', async () => {
    renderReviews({
      list: {
        items: [
          aReview(),
          aReview({ id: 2, rating: 2, authorName: 'Ben A.', comment: 'Too tight', createdAt: '2026-10-10T12:00:00.000Z' }),
        ],
        total: 2,
      },
    });

    expect(await screen.findByText('Lovely dress')).toBeInTheDocument();
    const first = screen.getByText('Lovely dress').closest('li');
    expect(within(first).getByRole('img', { name: 'Rated 5 out of 5' })).toBeInTheDocument();
    expect(first).toHaveTextContent('Anna K.');
    expect(first).toHaveTextContent('Oct 20, 2026');
    const second = screen.getByText('Too tight').closest('li');
    expect(within(second).getByRole('img', { name: 'Rated 2 out of 5' })).toBeInTheDocument();
    expect(second).toHaveTextContent('Ben A.');
  });

  it('shows a loading state first', () => {
    renderReviews();

    expect(screen.getByRole('status', { name: 'Loading reviews' })).toBeInTheDocument();
  });

  it('says there are no written reviews yet', async () => {
    renderReviews({ list: { items: [], total: 0 } });

    expect(await screen.findByText('No written reviews yet.')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    renderReviews({ listAnswer: failure });

    expect(await screen.findByText('Could not load the reviews.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('asks for the page in the URL, 10 at a time', async () => {
    const fetchMock = renderReviews({
      list: { items: [aReview()], total: 25 },
      url: '/products/midi-dress?reviewPage=2',
    });

    await screen.findByText('Lovely dress');

    expect(calledUrls(fetchMock)).toContain('/api/products/midi-dress/reviews?page=2&limit=10');
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('moves to the next page', async () => {
    const fetchMock = renderReviews({ list: { items: [aReview()], total: 12 } });
    await screen.findByText('Lovely dress');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() =>
      expect(calledUrls(fetchMock)).toContain('/api/products/midi-dress/reviews?page=2&limit=10'),
    );
  });

  it('goes back to the last page when the page in the URL has no reviews left', async () => {
    const empty = { body: { data: { items: [], page: 5, limit: 10, total: 12 } } };
    const fetchMock = renderReviews({
      url: '/products/midi-dress?reviewPage=5',
      listAnswer: (requested) =>
        requested.includes('page=5')
          ? empty
          : { body: { data: { items: [aReview({ comment: 'On the last page' })], page: 2, limit: 10, total: 12 } } },
    });

    expect(await screen.findByText('On the last page')).toBeInTheDocument();
    expect(calledUrls(fetchMock)).toContain('/api/products/midi-dress/reviews?page=2&limit=10');
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('shows no pagination for a single page', async () => {
    renderReviews({ list: { items: [aReview()], total: 1 } });
    await screen.findByText('Lovely dress');

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});
