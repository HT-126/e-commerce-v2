import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChoiceList from './ChoiceList.jsx';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

describe('ChoiceList', () => {
  it('picks exactly one choice', () => {
    render(<ChoiceList name="test" options={options} value="b" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Alpha' })).not.toBeChecked();
  });

  it('tells which choice was picked', () => {
    const onChange = vi.fn();
    render(<ChoiceList name="test" options={options} value="b" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Alpha' }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('also reports a click on the choice that is already picked (so a panel can close)', () => {
    const onChange = vi.fn();
    render(<ChoiceList name="test" options={options} value="b" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Beta' }));

    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('plain: the radio buttons are not drawn, and the picked choice shows a tick', () => {
    const { container } = render(
      <ChoiceList plain name="test" options={options} value="a" onChange={() => {}} />,
    );

    screen.getAllByRole('radio').forEach((radio) => expect(radio).toHaveClass('sr-only'));
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByText('Alpha').closest('label')).toHaveClass('font-medium');
    expect(screen.getByText('Beta').closest('label')).not.toHaveClass('font-medium');
  });

  it('default: draws a radio button for each choice and no tick', () => {
    const { container } = render(<ChoiceList name="test" options={options} value="a" onChange={() => {}} />);

    screen.getAllByRole('radio').forEach((radio) => expect(radio).not.toHaveClass('sr-only'));
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });
});
