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
    expect(screen.getAllByText('$44.99')).toHaveLength(2);
    expect(screen.getByText('4.8 (7)')).toBeInTheDocument();
    expect(screen.getByText('Rated 4.8 out of 5 from 7 reviews')).toBeInTheDocument();
  });

  it('shows an action under the empty message when one is given', () => {
    const onClick = vi.fn();
    renderGrid({
      items: [],
      emptyMessage: 'Nothing here.',
      emptyAction: <button onClick={onClick}>Clear it</button>,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear it' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows no action when there is none', () => {
    renderGrid({ items: [], emptyMessage: 'Nothing here.' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks a sold-out product', () => {
    renderGrid({ items: [productCard({ soldOut: true })] });

    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });
});
