import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PasswordInput from './PasswordInput.jsx';

describe('PasswordInput', () => {
  it('hides the password at first', () => {
    render(<PasswordInput label="Password" />);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Show reveals it and Hide hides it again, without losing what was typed', () => {
    render(<PasswordInput label="Password" />);
    const box = screen.getByLabelText('Password');
    fireEvent.change(box, { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(box).toHaveAttribute('type', 'text');
    expect(box).toHaveValue('secret123');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(box).toHaveAttribute('type', 'password');
    expect(box).toHaveValue('secret123');
  });

  it('the button does not submit a form', () => {
    render(
      <form onSubmit={(event) => event.preventDefault()}>
        <PasswordInput label="Password" />
      </form>,
    );

    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('type', 'button');
  });

  it('shows a hint, and an error in its place, like other fields', () => {
    const { rerender } = render(<PasswordInput label="Password" hint="At least 8 characters." />);
    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();

    rerender(<PasswordInput label="Password" hint="At least 8 characters." error="Too short" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
    expect(screen.queryByText('At least 8 characters.')).not.toBeInTheDocument();
  });
});
