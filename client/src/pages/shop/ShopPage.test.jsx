import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calledUrls, productCard, renderRoute, stubApi } from '../../test-utils.jsx';
import ShopPage from './ShopPage.jsx';

const categories = [
  { id: 1, name: 'Tops', slug: 'tops' },
  { id: 2, name: 'Dresses', slug: 'dresses' },
];

function renderShop(url, { total = 1, items = [productCard()] } = {}) {
  const fetchMock = stubApi((requested) =>
    requested.startsWith('/api/categories')
      ? { body: { data: categories } }
      : { body: { data: { items, page: 1, limit: 12, total } } },
  );
  renderRoute(<ShopPage />, { path: '/shop/:category?', url });
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('ShopPage', () => {
  it('asks the API for the category, sort and page in the URL', async () => {
    const fetchMock = renderShop('/shop/dresses?sort=price_asc&maxPriceCents=4499&q=red&page=2', {
      total: 30,
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Dresses' })).toBeInTheDocument();

    expect(calledUrls(fetchMock)).toContain(
      '/api/products?category=dresses&sort=price_asc&maxPriceCents=4499&q=red&page=2&limit=12',
    );
  });

  it('shows the products and how many there are', async () => {
    renderShop('/shop');

    expect(await screen.findByRole('link', { name: /Blue Dress/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'All products' })).toBeInTheDocument();
    expect(screen.getByText('1 product')).toBeInTheDocument();
  });

  it('shows an empty message when nothing matches', async () => {
    renderShop('/shop?q=zzz', { items: [], total: 0 });

    expect(await screen.findByText(/No products match your search/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Results for “zzz”' })).toBeInTheDocument();
  });

  it('changes the sort and goes back to page 1', async () => {
    const fetchMock = renderShop('/shop?page=2', { total: 30 });
    await screen.findByLabelText('Sort by');

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'rating' } });

    await vi.waitFor(() =>
      expect(calledUrls(fetchMock)).toContain('/api/products?sort=rating&page=1&limit=12'),
    );
  });

  it('filters by price', async () => {
    const fetchMock = renderShop('/shop');
    await screen.findByLabelText('Price');

    fireEvent.change(screen.getByLabelText('Price'), { target: { value: '4499' } });

    await vi.waitFor(() =>
      expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&maxPriceCents=4499&page=1&limit=12'),
    );
  });

  it('searches by title', async () => {
    const fetchMock = renderShop('/shop');
    const input = await screen.findByRole('searchbox', { name: 'Search by title' });

    fireEvent.change(input, { target: { value: '  midi ' } });
    fireEvent.submit(input.closest('form'));

    await vi.waitFor(() =>
      expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&q=midi&page=1&limit=12'),
    );
  });

  it('pages with Previous and Next', async () => {
    const fetchMock = renderShop('/shop', { total: 30 });

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await vi.waitFor(() =>
      expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&page=2&limit=12'),
    );
  });

  it('has no pagination for a single page', async () => {
    renderShop('/shop', { total: 5 });
    await screen.findByRole('link', { name: /Blue Dress/ });

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('shows the not found page for an unknown category', async () => {
    renderShop('/shop/nope');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('shows an error with a retry button when the server fails', async () => {
    stubApi((url) =>
      url.startsWith('/api/categories')
        ? { body: { data: categories } }
        : { status: 500, body: { error: { message: 'Something went wrong' } } },
    );
    renderRoute(<ShopPage />, { path: '/shop/:category?', url: '/shop' });

    expect(await screen.findByText('Could not load the products.')).toBeInTheDocument();
  });
});
