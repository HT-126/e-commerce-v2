import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, calledUrls, stubApi } from '../../test-utils.jsx';
import AdminLayout from './AdminLayout.jsx';

afterEach(() => vi.unstubAllGlobals());

function renderLayout({ logout = { status: 204 } } = {}) {
  const fetchMock = stubApi((url) => {
    if (url === '/api/auth/me') {
      return { body: { data: { user: aUser({ firstName: 'Olivia', lastName: 'Owner', role: 'admin' }) } } };
    }
    if (url === '/api/auth/logout') return logout;
    return { status: 404, body: { error: { message: 'Not found' } } };
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/orders']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="orders" element={<p>the orders page</p>} />
            <Route path="products" element={<p>the products page</p>} />
          </Route>
          <Route path="/" element={<p>the shop</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe('AdminLayout', () => {
  it('shows the page in the middle and the menu with its links', async () => {
    renderLayout();

    expect(await screen.findByText('the orders page')).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(menu).getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/admin/products');
    expect(within(menu).getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/admin/orders');
    expect(within(menu).getByRole('link', { name: 'Reviews' })).toHaveAttribute('href', '/admin/reviews');
    expect(within(menu).getByRole('link', { name: 'Back to store' })).toHaveAttribute('href', '/');
  });

  it('marks the page the owner is on', async () => {
    renderLayout();
    await screen.findByText('the orders page');

    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Products' })).not.toHaveAttribute('aria-current');
  });

  it('shows the admin\'s name in the top bar', async () => {
    renderLayout();

    expect(await screen.findByText('Olivia Owner')).toBeInTheDocument();
  });

  it('goes to another admin page from the menu', async () => {
    renderLayout();
    await screen.findByText('the orders page');

    fireEvent.click(screen.getByRole('link', { name: 'Products' }));

    expect(await screen.findByText('the products page')).toBeInTheDocument();
  });

  it('signs out and goes to the shop', async () => {
    const fetchMock = renderLayout();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('the shop')).toBeInTheDocument();
    expect(calledUrls(fetchMock)).toContain('/api/auth/logout');
  });

  it('stays on the page and lets the owner try again when signing out fails', async () => {
    renderLayout({ logout: { status: 500, body: { error: { message: 'Something went wrong' } } } });
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('the orders page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });
});
