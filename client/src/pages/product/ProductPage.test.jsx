import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute, stubApi } from '../../test-utils.jsx';
import ProductPage from './ProductPage.jsx';

const variant = (id, color, size, inStock) => ({ id, color, size, inStock });

const baseProduct = {
  id: 1,
  slug: 'midi-dress',
  title: 'Midi Dress',
  description: 'A nice dress.',
  category: { name: 'Dresses', slug: 'dresses' },
  priceCents: 3999,
  ratingAvg: 4.7,
  reviewCount: 7,
  material: 'Cotton',
  care: null,
  fit: null,
  length: null,
  closure: null,
  season: null,
  pattern: null,
  sizingNotes: 'True to size.',
  highlights: ['Soft fabric'],
  stylingNote: null,
  sizeChart: { headers: ['Size', 'Bust'], rows: [['S', '34']] },
  images: [{ url: 'https://cdn.example/a.webp', alt: 'Front', width: 800, height: 1000 }],
  colors: ['Gray', 'Black', 'White'],
  sizes: ['S', 'M'],
  // Gray is sold out completely. Black has S. White has M only.
  variants: [
    variant(1, 'Gray', 'S', false),
    variant(2, 'Gray', 'M', false),
    variant(3, 'Black', 'S', true),
    variant(4, 'Black', 'M', false),
    variant(5, 'White', 'S', false),
    variant(6, 'White', 'M', true),
  ],
};

// A fake API for the page: the product, its related products, and the reviews (a guest, with none).
function renderProduct(overrides = {}) {
  stubApi((url) => {
    if (url === '/api/auth/me') return { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };
    if (url.includes('/reviews?')) return { body: { data: { items: [], page: 1, limit: 10, total: 0 } } };
    if (url.endsWith('/related')) return { body: { data: [] } };
    return { body: { data: { ...baseProduct, ...overrides } } };
  });
  renderRoute(<ProductPage />, { path: '/products/:slug', url: '/products/midi-dress' });
}

const chip = (name) => screen.findByRole('button', { name });

afterEach(() => vi.unstubAllGlobals());

describe('ProductPage', () => {
  it('shows the real product data', async () => {
    renderProduct();

    expect(await screen.findByRole('heading', { level: 1, name: 'Midi Dress' })).toBeInTheDocument();
    expect(screen.getByText('$39.99')).toBeInTheDocument();
    expect(screen.getByText(/4\.7 · 7 reviews/)).toBeInTheDocument();
    expect(screen.getByText('True to size.')).toBeInTheDocument();
    expect(screen.getByText('Soft fabric')).toBeInTheDocument();
  });

  it('picks the first color that has a size in stock', async () => {
    renderProduct();

    await chip('Black');

    expect(screen.getByText('Color:').parentElement).toHaveTextContent('Color: Black');
    expect(screen.getByRole('button', { name: 'Black' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows sold-out colors and sizes disabled, not hidden', async () => {
    renderProduct();

    expect(await chip('Gray (sold out)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'S' })).toBeEnabled();
    // Black has no M in stock.
    expect(screen.getByRole('button', { name: 'M (sold out)' })).toBeDisabled();
  });

  it('asks for a size before adding to the bag', async () => {
    renderProduct();

    fireEvent.click(await screen.findByRole('button', { name: /Add to bag/ }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please choose a size.');
  });

  it('removes the size message once a size is chosen', async () => {
    renderProduct();

    fireEvent.click(await screen.findByRole('button', { name: /Add to bag/ }));
    fireEvent.click(screen.getByRole('button', { name: 'S' }));

    expect(screen.queryByText('Please choose a size.')).not.toBeInTheDocument();
    expect(screen.getByText('Size:').parentElement).toHaveTextContent('Size: S');
  });

  it('clears the size when the new color does not have it in stock', async () => {
    renderProduct();

    fireEvent.click(await chip('S'));
    fireEvent.click(screen.getByRole('button', { name: 'White' }));

    expect(screen.getByText('Size:').parentElement).toHaveTextContent('Size: Select a size');
  });

  it('shows a disabled "Sold out" button when every variant is sold out', async () => {
    renderProduct({
      variants: baseProduct.variants.map((v) => ({ ...v, inStock: false })),
    });

    expect(await screen.findByRole('button', { name: 'Sold out' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Add to bag/ })).not.toBeInTheDocument();
  });

  it('shows the size chart from the data, with a link to it', async () => {
    renderProduct();

    expect(await screen.findByRole('heading', { name: /Size chart/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Bust' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Size chart' })).toHaveAttribute('href', '#size-chart');
  });

  it('shows only the fit text when there is no size chart', async () => {
    renderProduct({ sizeChart: null });

    await screen.findByRole('heading', { level: 1 });

    expect(screen.queryByRole('heading', { name: /Size chart/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Size chart' })).not.toBeInTheDocument();
    expect(screen.getByText('True to size.')).toBeInTheDocument();
  });

  it('builds the fit text from fit and length when there are no sizing notes', async () => {
    renderProduct({ sizingNotes: null, fit: 'Relaxed', length: 'Midi' });

    expect(await screen.findByText('Relaxed fit, Midi length.')).toBeInTheDocument();
  });

  it('says there are no reviews yet when the count is 0', async () => {
    renderProduct({ ratingAvg: null, reviewCount: 0 });

    expect(await screen.findByText('No reviews yet.')).toBeInTheDocument();
  });

  it('shows the new rating after the buyer saves a review', async () => {
    let product = { ...baseProduct, ratingAvg: 4.7, reviewCount: 7 };
    let mine = null;
    stubApi((url, init) => {
      if (url === '/api/auth/me') {
        return { body: { data: { user: { id: 1, firstName: 'Anna', lastName: 'Kim', email: 'a@example.com', role: 'customer' } } } };
      }
      if (url.includes('/reviews?')) return { body: { data: { items: [], page: 1, limit: 10, total: 0 } } };
      if (url.endsWith('/reviews/mine')) {
        if (init.method === 'PUT') {
          mine = { ...JSON.parse(init.body), createdAt: '2026-10-25T12:00:00.000Z' };
          // The server recomputes the shown rating: now 8 reviews.
          product = { ...product, ratingAvg: 4.8, reviewCount: 8 };
          return { body: { data: { review: mine, ratingAvg: 4.8, reviewCount: 8 } } };
        }
        return { body: { data: { review: mine, canReview: true } } };
      }
      if (url.endsWith('/related')) return { body: { data: [] } };
      return { body: { data: product } };
    });
    renderRoute(<ProductPage />, { path: '/products/:slug', url: '/products/midi-dress' });
    expect(await screen.findByText(/Average from 7 reviews/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }));
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }));

    expect(await screen.findByText(/Average from 8 reviews/)).toBeInTheDocument();
    expect(screen.getByText('4.8 · 8 reviews')).toBeInTheDocument();
  });

  describe('the #reviews link from an order', () => {
    const scrollIntoView = vi.fn();

    beforeEach(() => {
      scrollIntoView.mockClear();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    function openAt(url) {
      stubApi((requested) => {
        if (requested === '/api/auth/me') return { status: 401, body: { error: { message: 'x', code: 'UNAUTHORIZED' } } };
        if (requested.includes('/reviews?')) return { body: { data: { items: [], page: 1, limit: 10, total: 0 } } };
        if (requested.endsWith('/related')) return { body: { data: [] } };
        return { body: { data: baseProduct } };
      });
      renderRoute(<ProductPage />, { path: '/products/:slug', url });
    }

    it('scrolls to the reviews once the product has loaded, and only once', async () => {
      openAt('/products/midi-dress#reviews');
      await screen.findByRole('heading', { level: 1, name: 'Midi Dress' });

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
      expect(document.getElementById('reviews')).toBeInTheDocument();
      expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('reviews'));
    });

    it('does not scroll without the link', async () => {
      openAt('/products/midi-dress');
      await screen.findByRole('heading', { level: 1, name: 'Midi Dress' });

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  it('shows the not found page for an unknown product', async () => {
    stubApi(() => ({ status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } }));
    renderRoute(<ProductPage />, { path: '/products/:slug', url: '/products/nope' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('shows an error with a retry button when the server fails', async () => {
    stubApi(() => ({ status: 500, body: { error: { message: 'Something went wrong' } } }));
    renderRoute(<ProductPage />, { path: '/products/:slug', url: '/products/midi-dress' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this product.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
