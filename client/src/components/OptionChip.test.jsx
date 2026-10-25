import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OptionChip from './OptionChip.jsx';

describe('OptionChip', () => {
  it('can be picked', () => {
    const onClick = vi.fn();
    render(<OptionChip label="M" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'M' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and says sold out when there is no stock, but stays visible', () => {
    const onClick = vi.fn();
    render(<OptionChip label="S" soldOut onClick={onClick} />);

    const chip = screen.getByRole('button', { name: 'S (sold out)' });
    fireEvent.click(chip);

    expect(chip).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows the selected state', () => {
    render(<OptionChip label="L" selected />);

    expect(screen.getByRole('button', { name: 'L' })).toHaveAttribute('aria-pressed', 'true');
  });
});
