import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomePage from './HomePage.jsx';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  );
}

const jsonResponse = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('HomePage', () => {
  it('shows loading, then the server status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(200, { data: { status: 'ok', db: 'ok' } })),
    );

    renderPage();

    expect(screen.getByText('Checking the server...')).toBeInTheDocument();
    expect(await screen.findByText('Server status: ok, database: ok')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({ credentials: 'include' }));
  });

  it('shows the error message when the server fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(500, { error: { message: 'Something went wrong' } })),
    );

    renderPage();

    expect(await screen.findByText('Server error: Something went wrong')).toBeInTheDocument();
  });
});
