import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubApi } from '../test-utils.jsx';
import Header from './Header.jsx';

afterEach(() => vi.unstubAllGlobals());

function renderHeader() {
  stubApi(() => ({
    body: {
      data: [
        { id: 1, name: 'Tops', slug: 'tops' },
        { id: 2, name: 'Dresses', slug: 'dresses' },
      ],
    },
  }));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Header', () => {
  it('links to New in, each category and the search', async () => {
    renderHeader();

    expect(await screen.findByRole('link', { name: 'Dresses' })).toHaveAttribute('href', '/shop/dresses');
    expect(screen.getByRole('link', { name: 'New in' })).toHaveAttribute('href', '/shop?sort=newest');
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/shop');
  });

  it('opens and closes the menu on small screens', async () => {
    renderHeader();
    await screen.findByRole('link', { name: 'Dresses' });

    // Only the wide-screen nav exists until the menu is opened.
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getAllByRole('link', { name: 'Tops' })[1]);
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
  });
});
