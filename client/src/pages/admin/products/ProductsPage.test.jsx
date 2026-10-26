import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calledUrls, renderRoute, stubApi } from '../../../test-utils.jsx';
import ProductsPage from './ProductsPage.jsx';

afterEach(() => vi.unstubAllGlobals());

const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };
const categories = [
  { id: 1, name: 'Tops', slug: 'tops' },
  { id: 2, name: 'Dresses', slug: 'dresses' },
];

const product = (overrides = {}) => ({
  id: 7,
  slug: 'blue-dress',
  title: 'Blue Dress',
  category: { name: 'Dresses', slug: 'dresses' },
  priceCents: 5999,
  isActive: true,
  variantCount: 3,
  totalStock: 12,
  imageUrl: 'https://cdn.example/blue.webp',
  ...overrides,
});
const page = (items, { total = items.length } = {}) => ({ body: { data: { items, page: 1, limit: 20, total } } });

function renderProducts(listAnswer, url = '/admin/products') {
  const fetchMock = stubApi((requested) =>
    requested === '/api/categories' ? { body: { data: categories } } : typeof listAnswer === 'function' ? listAnswer(requested) : listAnswer,
  );
  renderRoute(<ProductsPage />, { path: '/admin/products', url });
  return fetchMock;
}
const listUrls = (fetchMock) => calledUrls(fetchMock).filter((url) => url.startsWith('/api/admin/products'));

function pick(triggerName, optionName) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: triggerName }), { key: 'Enter' });
  fireEvent.keyDown(screen.getByRole('option', { name: optionName }), { key: 'Enter' });
}

describe('admin ProductsPage', () => {
  it('has a "New product" button', async () => {
    renderProducts(page([product()]));

    expect(await screen.findByRole('link', { name: 'New product' })).toHaveAttribute('href', '/admin/products/new');
  });

  it('shows a loading state first', () => {
    renderProducts(page([product()]));

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('lists the products with category, price, variants, stock and status, each linking to its edit page', async () => {
    renderProducts(page([product(), product({ id: 8, title: 'Hidden Top', isActive: false, totalStock: 0, variantCount: 0 })]));

    const link = await screen.findByRole('link', { name: 'Blue Dress' });
    const row = link.closest('tr');
    expect(link).toHaveAttribute('href', '/admin/products/7');
    expect(within(row).getByText('Dresses')).toBeInTheDocument();
    expect(within(row).getByText('$59.99')).toBeInTheDocument();
    expect(within(row).getByText('3')).toBeInTheDocument();
    expect(within(row).getByText('12')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: 'Hidden Top' }).closest('tr')).getByText('Hidden')).toBeInTheDocument();
  });

  it('asks the API for the page, sort and filters in the URL', async () => {
    const fetchMock = renderProducts(
      page([product()], { total: 45 }),
      '/admin/products?q=dress&category=dresses&active=true&sort=price_desc&page=2',
    );
    await screen.findByRole('link', { name: 'Blue Dress' });

    expect(listUrls(fetchMock)).toContain(
      '/api/admin/products?q=dress&category=dresses&active=true&sort=price_desc&page=2&limit=20',
    );
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('sorts by title and by price when their headers are clicked', async () => {
    const fetchMock = renderProducts(page([product()]));
    await screen.findByRole('link', { name: 'Blue Dress' });

    fireEvent.click(screen.getByRole('button', { name: /Title/ }));
    await waitFor(() => expect(listUrls(fetchMock).at(-1)).toBe('/api/admin/products?sort=title&page=1&limit=20'));

    fireEvent.click(screen.getByRole('button', { name: /Price/ }));
    await waitFor(() => expect(listUrls(fetchMock).at(-1)).toBe('/api/admin/products?sort=price_asc&page=1&limit=20'));
  });

  it('filters by category, using the shop\'s categories', async () => {
    const fetchMock = renderProducts(page([product()]));
    await screen.findByRole('link', { name: 'Blue Dress' });

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Filter by category' })).toBeInTheDocument());
    pick('Filter by category', 'Dresses');

    await waitFor(() => expect(listUrls(fetchMock).at(-1)).toBe('/api/admin/products?category=dresses&page=1&limit=20'));
  });

  it('filters by active or hidden', async () => {
    const fetchMock = renderProducts(page([product()]));
    await screen.findByRole('link', { name: 'Blue Dress' });

    pick('Filter by status', 'Hidden');

    await waitFor(() => expect(listUrls(fetchMock).at(-1)).toBe('/api/admin/products?active=false&page=1&limit=20'));
  });

  it('searches by title and goes back to page 1', async () => {
    const fetchMock = renderProducts(page([product()], { total: 45 }), '/admin/products?page=3');
    await screen.findByRole('link', { name: 'Blue Dress' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Search by title' }), { target: { value: ' linen ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(listUrls(fetchMock).at(-1)).toBe('/api/admin/products?q=linen&page=1&limit=20'));
  });

  it('clears the filters', async () => {
    const fetchMock = renderProducts(page([product()]), '/admin/products?q=dress&active=true');
    await screen.findByRole('link', { name: 'Blue Dress' });

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(listUrls(fetchMock).at(-1)).toBe('/api/admin/products?page=1&limit=20'));
  });

  it('asks for the next page', async () => {
    const fetchMock = renderProducts(page([product()], { total: 45 }));
    await screen.findByRole('link', { name: 'Blue Dress' });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(listUrls(fetchMock).at(-1)).toBe('/api/admin/products?page=2&limit=20'));
  });

  it('says there are no products, or none that match', async () => {
    renderProducts(page([]));
    expect(await screen.findByText('No products yet.')).toBeInTheDocument();
  });

  it('says no product matches the filters', async () => {
    renderProducts(page([]), '/admin/products?active=false');
    expect(await screen.findByText('No products match these filters.')).toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    let answer = failure;
    renderProducts(() => answer);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this list.');
    answer = page([product()]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Blue Dress' })).toBeInTheDocument();
  });
});
