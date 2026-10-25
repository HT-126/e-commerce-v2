import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, parsePath } from 'react-router';
import { vi } from 'vitest';

// Renders a page at a URL, with a fresh query cache that never retries.
// `extraRoutes`: more <Route> elements, for example a page to land on after a redirect.
// `state`: the router state the page is opened with, like a link with `state` would give.
export function renderRoute(element, { path = '/', url = '/', extraRoutes = null, state } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[state ? { ...parsePath(url), state } : url]}>
        <Routes>
          <Route path={path} element={element} />
          {extraRoutes}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Replaces fetch. `handler(url, init)` returns `{ status?, body }` for each request (`init` has the method and body).
export function stubApi(handler) {
  const fetchMock = vi.fn((url, init) => {
    const { status = 200, body } = handler(url, init);
    // 204 has no body
    return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const calledUrls = (fetchMock) => fetchMock.mock.calls.map(([url]) => url);

// The JSON bodies sent to one URL, newest last.
export const bodiesSentTo = (fetchMock, url) =>
  fetchMock.mock.calls.filter(([called]) => called === url).map(([, init]) => JSON.parse(init.body));

export const aUser = (overrides = {}) => ({
  id: 1,
  firstName: 'Anna',
  lastName: 'Kim',
  email: 'anna@example.com',
  role: 'customer',
  ...overrides,
});

export const aCartLine = (overrides = {}) => ({
  variantId: 1,
  productSlug: 'blue-dress',
  title: 'Blue Dress',
  color: 'Blue',
  size: 'M',
  imageUrl: 'https://cdn.example/blue.webp',
  unitPriceCents: 4000,
  quantity: 1,
  lineTotalCents: 4000,
  status: 'ok',
  ...overrides,
});

// A cart as the API returns it. Totals are worked out from the `ok` lines, like the server does.
export const aCart = (lines = []) => {
  const ok = lines.filter((line) => line.status === 'ok');
  const subtotalCents = ok.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const shippingCents = ok.length === 0 || subtotalCents >= 9700 ? 0 : 695;
  return {
    lines,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    canCheckout: lines.length > 0 && ok.length === lines.length,
  };
};

export const anOrderItem = (overrides = {}) => ({
  productSlug: 'blue-dress',
  title: 'Blue Dress',
  color: 'Blue',
  size: 'M',
  imageUrl: 'https://cdn.example/blue.webp',
  unitPriceCents: 4000,
  quantity: 1,
  lineTotalCents: 4000,
  ...overrides,
});

// An order as the API returns it (api.md).
export const anOrder = (overrides = {}) => ({
  orderNumber: 'LM-261025-4821',
  status: 'paid',
  createdAt: '2026-10-25T12:00:00.000Z',
  items: [anOrderItem()],
  subtotalCents: 4000,
  shippingCents: 695,
  totalCents: 4695,
  ...overrides,
});

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
