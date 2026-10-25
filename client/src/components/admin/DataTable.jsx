import { rowPaginationFeature, rowSortingFeature, tableFeatures, useTable } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });
const NO_ROWS = [];

// The catalog has 2,242 products, so the server pages and sorts (`manualPagination`, `manualSorting`): the table
// only shows the rows it is given. Its sort and page state come from the props, which come from the URL.
//
// A column that can be sorted names the API sort for each direction: `meta: { sort: { asc: 'price_asc', desc: 'price_desc' } }`.
const keyOf = (column, desc) => column.meta?.sort?.[desc ? 'desc' : 'asc'];

function sortingFor(columns, sort) {
  // No sort in the URL means the API's default. Without this, a column with no key for a direction would match.
  if (!sort) return [];
  for (const column of columns) {
    if (keyOf(column, false) === sort) return [{ id: column.id, desc: false }];
    if (keyOf(column, true) === sort) return [{ id: column.id, desc: true }];
  }
  return [];
}

function sortKeyFor(columns, sorting) {
  const [first] = sorting;
  const column = first && columns.find((c) => c.id === first.id);
  return column ? keyOf(column, first.desc) : undefined;
}

const SORT_ARROW = { asc: '↑', desc: '↓' };

// `columns` must be a stable array (define it outside the component). `rows` are the current page.
export default function DataTable({
  columns,
  rows = NO_ROWS,
  total = 0,
  page,
  limit,
  sort,
  onPageChange,
  onSortChange,
  isPending = false,
  isError = false,
  onRetry,
  emptyMessage = 'Nothing found.',
  getRowId = (row, index) => String(row.id ?? row.orderNumber ?? index),
}) {
  const tableColumns = useMemo(
    // A column needs an accessor to be sortable (the table treats the others as display only). The cells draw
    // themselves, so the accessor only has to exist.
    () =>
      columns.map((column) => ({
        accessorFn: (row) => row[column.id],
        ...column,
        enableSorting: Boolean(column.meta?.sort),
        // The first click goes to the direction the column has an API sort for.
        sortDescFirst: !column.meta?.sort?.asc && Boolean(column.meta?.sort?.desc),
      })),
    [columns],
  );
  const sorting = useMemo(() => sortingFor(columns, sort), [columns, sort]);
  const pagination = useMemo(() => ({ pageIndex: page - 1, pageSize: limit }), [page, limit]);

  const table = useTable({
    features,
    columns: tableColumns,
    data: rows,
    getRowId,
    rowCount: total,
    manualSorting: true,
    manualPagination: true,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortChange?.(sortKeyFor(columns, next));
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater;
      onPageChange?.(next.pageIndex + 1);
    },
  });

  const pageCount = Math.max(1, table.getPageCount());
  const bodyRows = table.getRowModel().rows;

  return (
    <div>
      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  const ariaSort = direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined;
                  return (
                    <TableHead key={header.id} aria-sort={canSort ? (ariaSort ?? 'none') : undefined}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <table.FlexRender header={header} />
                          <span aria-hidden="true">{direction ? SORT_ARROW[direction] : ''}</span>
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={columns.length} role="status" className="py-8 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} role="alert" className="py-8 text-center">
                  <p className="text-destructive">Could not load this list.</p>
                  {onRetry && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                      Try again
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : bodyRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              bodyRows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {total} {total === 1 ? 'result' : 'results'}
        </p>
        <nav aria-label="Pagination" className="flex items-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => table.previousPage()}>
            Previous
          </Button>
          <span>
            Page {page} of {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => table.nextPage()}>
            Next
          </Button>
        </nav>
      </div>
    </div>
  );
}
