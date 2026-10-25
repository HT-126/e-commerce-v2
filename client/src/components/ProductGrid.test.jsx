import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { productCard } from '../test-utils.jsx';
import ProductGrid from './ProductGrid.jsx';

const renderGrid = (props) =>
  render(
    <MemoryRouter>
      <ProductGrid {...props} />
    </MemoryRouter>,
  );

describe('ProductGrid', () => {
  it('shows a loading state', () => {
    renderGrid({ isPending: true, skeletonCount: 3 });

    expect(screen.getByRole('status', { name: 'Loading products' })).toBeInTheDocument();
  });

  it('shows the empty message', () => {
    renderGrid({ items: [], emptyMessage: 'Nothing here.' });

    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('shows an error with a retry button', () => {
    const onRetry = vi.fn();
    renderGrid({ isError: true, onRetry });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the products.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows each product as a link with its price and rating', () => {
    renderGrid({
      items: [productCard(), productCard({ id: 2, slug: 'red-top', title: 'Red Top', ratingAvg: null })],
    });

    expect(screen.getByRole('link', { name: /Blue Dress/ })).toHaveAttribute('href', '/products/blue-dress');
    expect(screen.getByText('$44.99 · 4.8 ★ (7)')).toBeInTheDocument();
    expect(screen.getByText('$44.99', { exact: true })).toBeInTheDocument();
  });

  it('marks a sold-out product', () => {
    renderGrid({ items: [productCard({ soldOut: true })] });

    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });
});
