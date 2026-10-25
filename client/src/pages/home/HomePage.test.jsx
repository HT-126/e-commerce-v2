import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calledUrls, productCard, renderRoute, stubApi } from '../../test-utils.jsx';
import HomePage from './HomePage.jsx';

afterEach(() => vi.unstubAllGlobals());

function renderHome() {
  const fetchMock = stubApi((url) => ({
    body: {
      data: { items: [productCard({ title: url.includes('rating') ? 'Top Pick' : 'Blue Dress' })], total: 1 },
    },
  }));
  renderRoute(<HomePage />);
  return fetchMock;
}

describe('HomePage', () => {
  it('shows the new arrivals first, with the promises and a Shop all button', async () => {
    const fetchMock = renderHome();

    expect(await screen.findAllByRole('link', { name: /Blue Dress/ })).not.toHaveLength(0);
    expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&limit=8');
    expect(screen.getByText('Free US shipping')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shop all' })).toHaveAttribute('href', '/shop');
  });

  it('marks the open list with aria-pressed', async () => {
    renderHome();
    await screen.findAllByRole('link', { name: /Blue Dress/ });

    expect(screen.getByRole('button', { name: 'New arrivals' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Top rated' }));

    expect(screen.getByRole('button', { name: 'Top rated' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'New arrivals' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the shipping promise as "$97 or more", matching the rule', async () => {
    renderHome();

    expect(await screen.findByText('On every order of $97 or more')).toBeInTheDocument();
  });

  it('does not claim a rating that the data cannot back up', () => {
    renderHome();

    expect(screen.queryByText(/Rated 4\.7/)).not.toBeInTheDocument();
  });

  it('loads the Top rated and Under $45 tabs from the API', async () => {
    const fetchMock = renderHome();
    await screen.findAllByRole('link', { name: /Blue Dress/ });

    fireEvent.click(screen.getByRole('button', { name: 'Top rated' }));
    expect(await screen.findByRole('link', { name: /Top Pick/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Under $45' }));
    await vi.waitFor(() =>
      expect(calledUrls(fetchMock)).toContain('/api/products?maxPriceCents=4499&limit=8'),
    );
    expect(calledUrls(fetchMock)).toContain('/api/products?sort=rating&limit=8');
  });

  it('shows an error with a retry button when the server fails', async () => {
    stubApi(() => ({ status: 500, body: { error: { message: 'Something went wrong' } } }));
    renderRoute(<HomePage />);

    expect(await screen.findByText('Could not load the products.')).toBeInTheDocument();
  });
});
