import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DataTable from './DataTable.jsx';

// Columns are defined once, outside the component, like the pages do.
const columns = [
  { id: 'title', header: 'Title', meta: { sort: { asc: 'title' } }, cell: ({ row }) => row.original.title },
  {
    id: 'price',
    header: 'Price',
    meta: { sort: { asc: 'price_asc', desc: 'price_desc' } },
    cell: ({ row }) => `$${row.original.price}`,
  },
  { id: 'total', header: 'Total', meta: { sort: { desc: 'total_desc' } }, cell: ({ row }) => row.original.total },
  { id: 'note', header: 'Note', cell: ({ row }) => row.original.note },
];
const rows = [
  { id: 1, title: 'Blue Dress', price: 40, note: 'a' },
  { id: 2, title: 'Red Top', price: 25, note: 'b' },
];

function renderTable(props = {}) {
  const handlers = { onPageChange: vi.fn(), onSortChange: vi.fn(), onRetry: vi.fn() };
  render(<DataTable columns={columns} rows={rows} total={45} page={1} limit={20} {...handlers} {...props} />);
  return handlers;
}

describe('DataTable', () => {
  it('shows a header for each column and a row for each item', () => {
    renderTable();

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent?.replace(/[↑↓]/g, ''))).toEqual([
      'Title',
      'Price',
      'Total',
      'Note',
    ]);
    expect(screen.getByRole('cell', { name: 'Blue Dress' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$25' })).toBeInTheDocument();
  });

  it('does not sort the rows itself: they stay in the order the server sent them', () => {
    renderTable({ rows: [rows[1], rows[0]], sort: 'title' });

    const names = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(names).toEqual(['Red Top', 'Blue Dress']);
  });

  describe('sorting', () => {
    it('has a sort button only on the columns that can be sorted', () => {
      renderTable();

      expect(screen.getByRole('button', { name: /Title/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Price/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Note/ })).not.toBeInTheDocument();
    });

    it('sends the API sort of a column when its header is clicked', () => {
      const { onSortChange } = renderTable();

      fireEvent.click(screen.getByRole('button', { name: /Price/ }));

      expect(onSortChange).toHaveBeenCalledWith('price_asc');
    });

    it('goes to the other direction on the next click', () => {
      const { onSortChange } = renderTable({ sort: 'price_asc' });

      fireEvent.click(screen.getByRole('button', { name: /Price/ }));

      expect(onSortChange).toHaveBeenCalledWith('price_desc');
    });

    it('goes back to the default sort (no sort) after the last direction', () => {
      const { onSortChange } = renderTable({ sort: 'price_desc' });

      fireEvent.click(screen.getByRole('button', { name: /Price/ }));

      expect(onSortChange).toHaveBeenCalledWith(undefined);
    });

    it('sorts a column that has only one direction, then clears the sort', () => {
      const first = renderTable();
      fireEvent.click(screen.getByRole('button', { name: /Title/ }));
      expect(first.onSortChange).toHaveBeenLastCalledWith('title');
    });

    it('goes to the only direction of a column that sorts one way, on the first click', () => {
      const { onSortChange } = renderTable();

      fireEvent.click(screen.getByRole('button', { name: /Total/ }));

      expect(onSortChange).toHaveBeenLastCalledWith('total_desc');
    });

    it('goes back to no sort after the only direction of a one-direction column', () => {
      const { onSortChange } = renderTable({ sort: 'title' });

      fireEvent.click(screen.getByRole('button', { name: /Title/ }));

      // Next is the descending click, which this column has no API sort for, so it clears the sort.
      expect(onSortChange).toHaveBeenLastCalledWith(undefined);
    });

    it('shows no column as sorted when there is no sort', () => {
      renderTable();

      for (const header of screen.getAllByRole('columnheader')) {
        expect(header.getAttribute('aria-sort') ?? '').not.toMatch(/ascending|descending/);
      }
    });

    it('shows which column is sorted, and which way, to everyone', () => {
      renderTable({ sort: 'price_desc' });

      expect(screen.getByRole('columnheader', { name: /Price/ })).toHaveAttribute('aria-sort', 'descending');
      expect(screen.getByRole('columnheader', { name: /Title/ })).toHaveAttribute('aria-sort', 'none');
      expect(screen.getByRole('columnheader', { name: /Note/ })).not.toHaveAttribute('aria-sort');
    });
  });

  describe('paging', () => {
    it('shows the page, the number of pages and the total', () => {
      renderTable({ page: 2 });

      expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('45 results')).toBeInTheDocument();
    });

    it('asks for the next and the previous page', () => {
      const { onPageChange } = renderTable({ page: 2 });

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(onPageChange).toHaveBeenLastCalledWith(3);
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(onPageChange).toHaveBeenLastCalledWith(1);
    });

    it('cannot go before the first page or past the last one', () => {
      renderTable({ page: 1 });
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    });

    it('cannot go past the last page', () => {
      renderTable({ page: 3 });
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    });

    it('says "1 result" for one', () => {
      renderTable({ total: 1, rows: [rows[0]] });

      expect(screen.getByText('1 result')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });
  });

  describe('a page past the end', () => {
    it('asks for the last page when the page has no rows but there are results', () => {
      const { onPageChange } = renderTable({ rows: [], total: 45, page: 5 });

      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('does nothing on a page that has rows, or when there are no results at all', () => {
      const first = renderTable({ page: 2 });
      expect(first.onPageChange).not.toHaveBeenCalled();

      const second = renderTable({ rows: [], total: 0, page: 1 });
      expect(second.onPageChange).not.toHaveBeenCalled();
    });

    it('does nothing while the list is loading or has failed', () => {
      const loading = renderTable({ rows: [], total: 45, page: 5, isPending: true });
      expect(loading.onPageChange).not.toHaveBeenCalled();

      const failed = renderTable({ rows: [], total: 45, page: 5, isError: true });
      expect(failed.onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('shows a loading state, not the rows', () => {
      renderTable({ isPending: true, rows: [] });

      expect(screen.getByRole('status')).toHaveTextContent('Loading...');
      expect(screen.queryByRole('cell', { name: 'Blue Dress' })).not.toBeInTheDocument();
    });

    it('shows an error with a retry button', () => {
      const { onRetry } = renderTable({ isError: true, rows: [] });

      expect(screen.getByRole('alert')).toHaveTextContent('Could not load this list.');
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows the empty message when there are no rows', () => {
      renderTable({ rows: [], total: 0, emptyMessage: 'No orders found.' });

      expect(screen.getByText('No orders found.')).toBeInTheDocument();
    });
  });
});
