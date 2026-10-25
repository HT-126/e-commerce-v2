import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { productCard } from '../test-utils.jsx';
import ProductCard from './ProductCard.jsx';

const renderCard = (overrides) =>
  render(
    <MemoryRouter>
      <ProductCard product={productCard(overrides)} />
    </MemoryRouter>,
  );

describe('ProductCard', () => {
  it('shows the price on one line and the rating on its own line below it', () => {
    renderCard();

    const price = screen.getByText('$44.99');
    const rating = screen.getByText('4.8 (7)');

    expect(price.textContent).toBe('$44.99');
    expect(price.nextElementSibling).toBe(rating.closest('p'));
  });

  it('describes the rating in words for screen readers', () => {
    renderCard({ ratingAvg: 5, reviewCount: 1 });

    expect(screen.getByText('Rated 5.0 out of 5 from 1 review')).toBeInTheDocument();
  });

  it('keeps an empty rating line when there is no rating, so every card has the same height', () => {
    renderCard({ ratingAvg: null, reviewCount: 0 });

    const price = screen.getByText('$44.99');
    const ratingLine = price.nextElementSibling;

    expect(ratingLine).toBeInTheDocument();
    expect(ratingLine).toHaveTextContent('');
    expect(ratingLine).toHaveClass('min-h-5');
  });

  it('links to the product', () => {
    renderCard();

    expect(screen.getByRole('link', { name: /Blue Dress/ })).toHaveAttribute('href', '/products/blue-dress');
  });

  it('marks a sold-out product', () => {
    renderCard({ soldOut: true });

    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });
});
