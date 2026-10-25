import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';

// Renders a page at a URL, with a fresh query cache that never retries.
export function renderRoute(element, { path = '/', url = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Replaces fetch. `handler(url)` returns `{ status?, body }` for each request.
export function stubApi(handler) {
  const fetchMock = vi.fn((url) => {
    const { status = 200, body } = handler(url);
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const calledUrls = (fetchMock) => fetchMock.mock.calls.map(([url]) => url);

export const productCard = (overrides = {}) => ({
  id: 1,
  slug: 'blue-dress',
  title: 'Blue Dress',
  priceCents: 4499,
  ratingAvg: 4.8,
  reviewCount: 7,
  imageUrl: 'https://cdn.example/blue.webp',
  imageAlt: 'Blue dress',
  soldOut: false,
  ...overrides,
});
