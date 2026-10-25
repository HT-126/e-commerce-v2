import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FilterDropdown from './FilterDropdown.jsx';

const renderDropdown = (props) =>
  render(
    <div>
      <p>Outside</p>
      <FilterDropdown label="Color" {...props}>
        <p>Panel content</p>
      </FilterDropdown>
    </div>,
  );

describe('FilterDropdown', () => {
  it('starts closed and opens and closes with its button', () => {
    renderDropdown();
    const button = screen.getByRole('button', { name: 'Color' });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Color' })).toHaveTextContent('Panel content');

    fireEvent.click(button);
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  });

  it('shows how many choices are ticked', () => {
    renderDropdown({ count: 2 });

    expect(screen.getByRole('button', { name: 'Color (2)' })).toBeInTheDocument();
  });

  it('shows no count when nothing is ticked', () => {
    renderDropdown({ count: 0 });

    expect(screen.getByRole('button', { name: 'Color' })).toBeInTheDocument();
  });

  it('names the control for screen readers when the button shows the current choice', () => {
    render(
      <FilterDropdown label="Newest" name="Sort by">
        <p>Choices</p>
      </FilterDropdown>,
    );
    const button = screen.getByRole('button', { name: 'Sort by: Newest' });

    expect(button).toHaveTextContent('Newest');
    fireEvent.click(button);
    expect(screen.getByRole('group', { name: 'Sort by' })).toBeInTheDocument();
  });

  it('gives a function child a close that shuts the panel and returns the focus', () => {
    render(
      <FilterDropdown label="Price">{({ close }) => <button onClick={close}>Pick</button>}</FilterDropdown>,
    );
    const button = screen.getByRole('button', { name: 'Price' });
    fireEvent.click(button);

    fireEvent.click(screen.getByRole('button', { name: 'Pick' }));

    expect(screen.queryByRole('button', { name: 'Pick' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes on Escape and puts the focus back on the button', () => {
    renderDropdown();
    const button = screen.getByRole('button', { name: 'Color' });
    fireEvent.click(button);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes when Tab moves focus outside, but not when focus stays inside', () => {
    render(
      <div>
        <button>Next to it</button>
        <FilterDropdown label="Color">
          <input aria-label="Inside" />
        </FilterDropdown>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Color' }));

    fireEvent.focusIn(screen.getByLabelText('Inside'));
    expect(screen.getByLabelText('Inside')).toBeInTheDocument();

    fireEvent.focusIn(screen.getByRole('button', { name: 'Next to it' }));
    expect(screen.queryByLabelText('Inside')).not.toBeInTheDocument();
  });

  it('closes on a click outside, but not on a click inside', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Color' }));

    fireEvent.pointerDown(screen.getByText('Panel content'));
    expect(screen.getByText('Panel content')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText('Outside'));
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  });
});
