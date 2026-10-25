import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TextField from './TextField.jsx';

describe('TextField', () => {
  it('connects the label to the box', () => {
    render(<TextField label="Email address" name="email" />);

    expect(screen.getByLabelText('Email address')).toHaveAttribute('name', 'email');
  });

  it('shows a hint and links it to the box', () => {
    render(<TextField label="Password" hint="At least 8 characters." />);

    const box = screen.getByLabelText('Password');

    expect(box).toHaveAccessibleDescription('At least 8 characters.');
    expect(box).not.toHaveAttribute('aria-invalid');
  });

  it('shows an error, marks the box invalid, and links the error to it', () => {
    render(<TextField label="Email address" error="Enter a valid email" />);

    const box = screen.getByLabelText('Email address');

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Enter a valid email');
  });

  it('an error takes the place of the hint, so the same words are not shown twice', () => {
    render(<TextField label="Password" hint="At least 8 characters." error="At least 8 characters" />);

    expect(screen.queryByText('At least 8 characters.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('At least 8 characters');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters');
  });

  it('the hint comes back when the error goes away', () => {
    const { rerender } = render(<TextField label="Password" hint="A hint" error="An error" />);

    rerender(<TextField label="Password" hint="A hint" />);

    expect(screen.getByText('A hint')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('passes the other props to the box, like a ref and the type', () => {
    let element = null;
    render(
      <TextField label="Name" type="email" required autoComplete="email" ref={(el) => (element = el)} />,
    );

    const box = screen.getByLabelText('Name');

    expect(element).toBe(box);
    expect(box).toHaveAttribute('type', 'email');
    expect(box).toBeRequired();
    expect(box).toHaveAttribute('autocomplete', 'email');
  });
});
