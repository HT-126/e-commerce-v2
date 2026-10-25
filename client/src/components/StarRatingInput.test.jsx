import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import StarRatingInput from './StarRatingInput.jsx';

function Harness({ start = 0 }) {
  const [value, setValue] = useState(start);
  return <StarRatingInput value={value} onChange={setValue} />;
}

describe('StarRatingInput', () => {
  it('is a group of 5 radio buttons named in stars', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Your rating' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['1', '2', '3', '4', '5']);
    expect(screen.getByRole('radio', { name: '1 star' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '5 stars' })).toBeInTheDocument();
  });

  it('has nothing chosen at the start', () => {
    render(<Harness />);

    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
  });

  it('chooses the star that is clicked, and only that one', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('radio', { name: '3 stars' }));
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
    expect(screen.getByRole('radio', { name: '5 stars' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3 stars' })).not.toBeChecked();
  });

  it('starts with the given rating chosen', () => {
    render(<Harness start={4} />);

    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked();
  });
});
