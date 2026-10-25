import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubApi } from '../test-utils.jsx';
import Header from './Header.jsx';

afterEach(() => vi.unstubAllGlobals());

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderHeader(url = '/') {
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
      <MemoryRouter initialEntries={[url]}>
        <Header />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const where = () => screen.getByTestId('where').textContent;

describe('Header', () => {
  it('links to New in and each category', async () => {
    renderHeader();

    expect(await screen.findByRole('link', { name: 'Dresses' })).toHaveAttribute('href', '/shop/dresses');
    expect(screen.getByRole('link', { name: 'New in' })).toHaveAttribute('href', '/shop?sort=newest');
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

  describe('search', () => {
    it('opens a search field from the Search button', () => {
      renderHeader();
      const button = screen.getByRole('button', { name: 'Search' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('searchbox', { name: 'Search by title' })).toHaveFocus();
    });

    it('goes to the shop with the search text, and closes the field', () => {
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  midi dress ' } });
      fireEvent.submit(screen.getByRole('search'));

      expect(where()).toBe('/shop?q=midi+dress');
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('an empty search shows all products', () => {
      renderHeader('/shop?q=dress');
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '   ' } });
      fireEvent.submit(screen.getByRole('search'));

      expect(where()).toBe('/shop');
    });

    it('starts with the current search text when the shop already has one', () => {
      renderHeader('/shop?q=wrap');
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      expect(screen.getByRole('searchbox')).toHaveValue('wrap');
    });

    it('closes on Escape and puts the focus back on the button', () => {
      renderHeader();
      const button = screen.getByRole('button', { name: 'Search' });
      fireEvent.click(button);

      fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(button).toHaveFocus();
      expect(where()).toBe('/');
    });

    it('opening the menu closes the search, and the other way round', async () => {
      renderHeader();
      await screen.findByRole('link', { name: 'Dresses' });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
    });
  });
});
