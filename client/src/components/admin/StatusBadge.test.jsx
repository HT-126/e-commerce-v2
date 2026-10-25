import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge.jsx';

describe('StatusBadge', () => {
  it.each([
    ['paid', 'Paid'],
    ['shipped', 'Shipped'],
    ['delivered', 'Delivered'],
    ['cancelled', 'Cancelled'],
    ['active', 'Active'],
    ['hidden', 'Hidden'],
  ])('shows %s as "%s"', (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows an unknown status as it is', () => {
    render(<StatusBadge status="refunded" />);

    expect(screen.getByText('refunded')).toBeInTheDocument();
  });
});
