import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calledUrls, productCard, renderRoute, stubApi } from '../../test-utils.jsx';
import ShopPage from './ShopPage.jsx';

const categories = [
  { id: 1, name: 'Tops', slug: 'tops' },
  { id: 2, name: 'Dresses', slug: 'dresses' },
];

const filterOptions = {
  colors: [
    { key: 'black', label: 'Black' },
    { key: 'white', label: 'White' },
    { key: 'blue', label: 'Blue' },
  ],
  sizes: ['S', 'M', 'L', 'XL'],
};

function renderShop(url, { total = 1, items = [productCard()] } = {}) {
  const fetchMock = stubApi((requested) => {
    if (requested.startsWith('/api/categories')) return { body: { data: categories } };
    if (requested.startsWith('/api/filters')) return { body: { data: filterOptions } };
    return { body: { data: { items, page: 1, limit: 12, total } } };
  });
  renderRoute(<ShopPage />, { path: '/shop/:category?', url });
  return fetchMock;
}

const productUrls = (fetchMock) => calledUrls(fetchMock).filter((url) => url.startsWith('/api/products'));
const lastProductUrl = (fetchMock) => productUrls(fetchMock).at(-1);

async function openAndTick(button, ...names) {
  fireEvent.click(await screen.findByRole('button', { name: button }));
  for (const name of names) fireEvent.click(await screen.findByRole('checkbox', { name }));
}

// Price and Sort open a panel of choices, like Color. `buttonName` is the button's name, for example "Sort by: Newest".
async function choose(buttonName, optionName) {
  fireEvent.click(await screen.findByRole('button', { name: buttonName }));
  fireEvent.click(await screen.findByRole('radio', { name: optionName }));
}

const sortButton = () => screen.findByRole('button', { name: /^Sort by:/ });

afterEach(() => vi.unstubAllGlobals());

describe('ShopPage', () => {
  it('asks the API for the category, sort, filters and page in the URL', async () => {
    const fetchMock = renderShop(
      '/shop/dresses?sort=price_asc&minPriceCents=2500&maxPriceCents=4999&color=black,white&size=M,L&q=red&page=2',
      { total: 30 },
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Dresses' })).toBeInTheDocument();

    expect(calledUrls(fetchMock)).toContain(
      '/api/products?category=dresses&sort=price_asc&minPriceCents=2500&maxPriceCents=4999&color=black%2Cwhite&size=M%2CL&q=red&page=2&limit=12',
    );
  });

  it('shows the products and how many there are', async () => {
    renderShop('/shop');

    expect(await screen.findByRole('link', { name: /Blue Dress/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'All products' })).toBeInTheDocument();
    expect(screen.getByText('1 product')).toBeInTheDocument();
  });

  it('has no search box on the page (search is in the header)', async () => {
    renderShop('/shop');
    await screen.findByRole('link', { name: /Blue Dress/ });

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the search text from the URL in the title', async () => {
    renderShop('/shop?q=zzz', { items: [], total: 0 });

    expect(await screen.findByRole('heading', { level: 1, name: 'Results for “zzz”' })).toBeInTheDocument();
  });

  describe('color and size', () => {
    it('ticking several colors updates the request and the count on the button', async () => {
      const fetchMock = renderShop('/shop');

      await openAndTick('Color', 'Black');
      await vi.waitFor(() => expect(lastProductUrl(fetchMock)).toContain('color=black&'));
      fireEvent.click(screen.getByRole('checkbox', { name: 'White' }));

      await vi.waitFor(() => expect(lastProductUrl(fetchMock)).toContain('color=black%2Cwhite'));
      expect(screen.getByRole('button', { name: 'Color (2)' })).toBeInTheDocument();
    });

    it('unticking a color removes it', async () => {
      const fetchMock = renderShop('/shop?color=black,white');

      await openAndTick('Color (2)', 'Black');

      await vi.waitFor(() => expect(lastProductUrl(fetchMock)).toContain('color=white&'));
      expect(screen.getByRole('checkbox', { name: 'Black' })).not.toBeChecked();
    });

    it('ticking several sizes puts them in the order of the options', async () => {
      const fetchMock = renderShop('/shop');

      await openAndTick('Size', 'L', 'S');

      await vi.waitFor(() => expect(lastProductUrl(fetchMock)).toContain('size=S%2CL'));
      expect(screen.getByRole('button', { name: 'Size (2)' })).toBeInTheDocument();
    });

    it('a size typed in lower case in the URL ticks the matching box', async () => {
      const fetchMock = renderShop('/shop?size=m');

      expect(await screen.findByRole('button', { name: 'Size (1)' })).toBeInTheDocument();
      await vi.waitFor(() => expect(lastProductUrl(fetchMock)).toContain('size=M&'));
      fireEvent.click(screen.getByRole('button', { name: 'Size (1)' }));
      expect(await screen.findByRole('checkbox', { name: 'M' })).toBeChecked();
    });

    it('lists the color groups from the API', async () => {
      renderShop('/shop');

      fireEvent.click(await screen.findByRole('button', { name: 'Color' }));

      expect((await screen.findAllByRole('checkbox')).map((box) => box.parentElement.textContent)).toEqual([
        'Black',
        'White',
        'Blue',
      ]);
    });

    it('shows a message in the panel when the options cannot be loaded', async () => {
      stubApi((url) => {
        if (url.startsWith('/api/categories')) return { body: { data: categories } };
        if (url.startsWith('/api/filters')) return { status: 500, body: { error: { message: 'x' } } };
        return { body: { data: { items: [productCard()], page: 1, limit: 12, total: 1 } } };
      });
      renderRoute(<ShopPage />, { path: '/shop/:category?', url: '/shop' });

      fireEvent.click(await screen.findByRole('button', { name: 'Color' }));

      expect(await screen.findByText('Could not load the options.')).toBeInTheDocument();
    });
  });

  describe('price', () => {
    it.each([
      ['Under $25', '/api/products?sort=newest&maxPriceCents=2499&page=1&limit=12'],
      ['$25-$50', '/api/products?sort=newest&minPriceCents=2500&maxPriceCents=4999&page=1&limit=12'],
      ['$50-$75', '/api/products?sort=newest&minPriceCents=5000&maxPriceCents=7499&page=1&limit=12'],
      ['$75-$100', '/api/products?sort=newest&minPriceCents=7500&maxPriceCents=9999&page=1&limit=12'],
      ['$100+', '/api/products?sort=newest&minPriceCents=10000&page=1&limit=12'],
    ])('choosing %s asks the API for that range', async (label, expectedUrl) => {
      const fetchMock = renderShop('/shop');

      await choose('Price: Any price', label);

      await vi.waitFor(() => expect(calledUrls(fetchMock)).toContain(expectedUrl));
    });

    it('"Any price" removes the range again', async () => {
      const fetchMock = renderShop('/shop?minPriceCents=2500&maxPriceCents=4999');

      await choose('Price: $25-$50', 'Any price');

      await vi.waitFor(() =>
        expect(lastProductUrl(fetchMock)).toBe('/api/products?sort=newest&page=1&limit=12'),
      );
    });

    it('lists the price ranges as one-of-many choices, with the current one picked', async () => {
      renderShop('/shop?minPriceCents=5000&maxPriceCents=7499');

      fireEvent.click(await screen.findByRole('button', { name: 'Price: $50-$75' }));

      expect((await screen.findAllByRole('radio')).map((radio) => radio.parentElement.textContent)).toEqual([
        'Any price',
        'Under $25',
        '$25-$50',
        '$50-$75',
        '$75-$100',
        '$100+',
      ]);
      expect(screen.getByRole('radio', { name: '$50-$75' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Any price' })).not.toBeChecked();
    });

    it('closes the panel after a pick and puts the focus back on the button', async () => {
      renderShop('/shop');

      await choose('Price: Any price', 'Under $25');

      expect(screen.queryByRole('group', { name: 'Price' })).not.toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Price: Under $25' })).toHaveFocus();
    });
  });

  describe('sort', () => {
    it('opens a plain list of the four sorts, with no checkboxes and no radio circles', async () => {
      renderShop('/shop?sort=rating');

      fireEvent.click(await screen.findByRole('button', { name: 'Sort by: Top rated' }));
      const panel = await screen.findByRole('group', { name: 'Sort by' });

      expect(within(panel).queryAllByRole('checkbox')).toHaveLength(0);
      expect(
        within(panel)
          .getAllByRole('radio')
          .map((radio) => radio.parentElement.textContent),
      ).toEqual(['Newest', 'Top rated', 'Price: low to high', 'Price: high to low']);
      // the real radio inputs are there for keyboards and screen readers, but not drawn
      within(panel)
        .getAllByRole('radio')
        .forEach((radio) => expect(radio).toHaveClass('sr-only'));
      expect(within(panel).getByRole('radio', { name: 'Top rated' })).toBeChecked();
    });

    it('picking a sort asks the API and closes the panel', async () => {
      const fetchMock = renderShop('/shop?page=2', { total: 30 });

      await choose('Sort by: Newest', 'Price: low to high');

      await vi.waitFor(() =>
        expect(lastProductUrl(fetchMock)).toBe('/api/products?sort=price_asc&page=1&limit=12'),
      );
      expect(screen.queryByRole('group', { name: 'Sort by' })).not.toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Sort by: Price: low to high' })).toHaveFocus();
    });

    it('picking the sort that is already chosen just closes the panel', async () => {
      const fetchMock = renderShop('/shop');
      await screen.findByRole('link', { name: /Blue Dress/ });
      const before = productUrls(fetchMock).length;

      await choose('Sort by: Newest', 'Newest');

      expect(screen.queryByRole('group', { name: 'Sort by' })).not.toBeInTheDocument();
      expect(productUrls(fetchMock).length).toBe(before);
    });
  });

  describe('combining and keeping the filters', () => {
    it('keeps category, sort and the other filters when one filter changes', async () => {
      const fetchMock = renderShop('/shop/dresses?sort=rating&color=black&page=3', { total: 60 });

      await openAndTick('Size', 'M');

      await vi.waitFor(() =>
        expect(lastProductUrl(fetchMock)).toBe(
          '/api/products?category=dresses&sort=rating&color=black&size=M&page=1&limit=12',
        ),
      );
    });

    it('a refresh (a page opened with the filters in the URL) shows them again', async () => {
      renderShop('/shop?color=black,white&size=M&minPriceCents=2500&maxPriceCents=4999&sort=price_desc');

      expect(await screen.findByRole('button', { name: 'Color (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Size (1)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Price: $25-$50' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sort by: Price: high to low' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Color (2)' }));
      expect(await screen.findByRole('checkbox', { name: 'Black' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'White' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Blue' })).not.toBeChecked();
    });

    it('changes the sort and goes back to page 1', async () => {
      const fetchMock = renderShop('/shop?page=2', { total: 30 });

      await choose('Sort by: Newest', 'Top rated');

      await vi.waitFor(() =>
        expect(calledUrls(fetchMock)).toContain('/api/products?sort=rating&page=1&limit=12'),
      );
    });
  });

  describe('Clear filters', () => {
    it('is not shown when no filter is active', async () => {
      renderShop('/shop?sort=rating&page=2', { total: 30 });
      await sortButton();

      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    });

    it('resets color, size, price and search, but keeps the category and the sort', async () => {
      const fetchMock = renderShop(
        '/shop/dresses?sort=rating&color=black&size=M&minPriceCents=2500&maxPriceCents=4999&q=red&page=2',
        { total: 30 },
      );

      fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));

      await vi.waitFor(() =>
        expect(lastProductUrl(fetchMock)).toBe('/api/products?category=dresses&sort=rating&page=1&limit=12'),
      );
      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Color' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Price: Any price' })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('says no products match the filters and offers Clear filters', async () => {
      const fetchMock = renderShop('/shop?color=black', { items: [], total: 0 });

      const message = await screen.findByText('No products match these filters.');
      fireEvent.click(within(message.parentElement).getByRole('button', { name: 'Clear filters' }));

      await vi.waitFor(() =>
        expect(lastProductUrl(fetchMock)).toBe('/api/products?sort=newest&page=1&limit=12'),
      );
    });

    it('has no Clear filters button when nothing is filtered', async () => {
      renderShop('/shop', { items: [], total: 0 });

      expect(await screen.findByText('No products found.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    });
  });

  describe('bad values in the URL', () => {
    it('are ignored, so the API never answers 400', async () => {
      const fetchMock = renderShop('/shop?sort=foo&minPriceCents=abc&page=1.5');

      expect(await screen.findByRole('link', { name: /Blue Dress/ })).toBeInTheDocument();

      expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&page=1&limit=12');
      expect(screen.getByRole('button', { name: 'Price: Any price' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sort by: Newest' })).toBeInTheDocument();
    });

    it('a price that is not one of the choices is ignored', async () => {
      const fetchMock = renderShop('/shop?maxPriceCents=3000');

      expect(await screen.findByRole('button', { name: 'Price: Any price' })).toBeInTheDocument();
      expect(productUrls(fetchMock).every((url) => !url.includes('maxPriceCents'))).toBe(true);
    });

    it('a list item that is too long is dropped', async () => {
      const fetchMock = renderShop(`/shop?size=${'a'.repeat(25)},M`);

      await sortButton();

      expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&size=M&page=1&limit=12');
    });

    it('a search that is too long is cut', async () => {
      const fetchMock = renderShop(`/shop?q=${'a'.repeat(150)}`);

      await sortButton();

      expect(calledUrls(fetchMock)).toContain(
        `/api/products?sort=newest&q=${'a'.repeat(100)}&page=1&limit=12`,
      );
    });
  });

  describe('paging', () => {
    it('pages with Previous and Next', async () => {
      const fetchMock = renderShop('/shop', { total: 30 });

      expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      await vi.waitFor(() =>
        expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&page=2&limit=12'),
      );
    });

    it('has no pagination for a single page', async () => {
      renderShop('/shop', { total: 5 });
      await screen.findByRole('link', { name: /Blue Dress/ });

      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });

    it('gives a way back from a page past the end', async () => {
      const fetchMock = renderShop('/shop?page=99', { items: [], total: 30 });

      expect(await screen.findByText('Page 99 of 3')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

      await vi.waitFor(() =>
        expect(calledUrls(fetchMock)).toContain('/api/products?sort=newest&page=3&limit=12'),
      );
    });
  });

  describe('loading and errors', () => {
    const withGate = (handler) => {
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) => {
          if (url.startsWith('/api/categories')) return Response.json({ data: categories });
          if (url.startsWith('/api/filters')) return Response.json({ data: filterOptions });
          return handler(url, gate);
        }),
      );
      return release;
    };

    it('does not show the old list under a new filter', async () => {
      const release = withGate(async (url, gate) => {
        if (url.includes('sort=rating')) await gate;
        const title = url.includes('sort=rating') ? 'Top Pick' : 'Blue Dress';
        return Response.json({ data: { items: [productCard({ title })], page: 1, limit: 12, total: 1 } });
      });
      renderRoute(<ShopPage />, { path: '/shop/:category?', url: '/shop' });
      await screen.findByRole('link', { name: /Blue Dress/ });

      await choose('Sort by: Newest', 'Top rated');

      expect(await screen.findByRole('status', { name: 'Loading products' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Blue Dress/ })).not.toBeInTheDocument();
      release();
      expect(await screen.findByRole('link', { name: /Top Pick/ })).toBeInTheDocument();
    });

    it('keeps the current page visible while the next page loads', async () => {
      const release = withGate(async (url, gate) => {
        if (url.includes('page=2')) await gate;
        const title = url.includes('page=2') ? 'Page Two Dress' : 'Blue Dress';
        return Response.json({ data: { items: [productCard({ title })], page: 1, limit: 12, total: 30 } });
      });
      renderRoute(<ShopPage />, { path: '/shop/:category?', url: '/shop' });
      await screen.findByRole('link', { name: /Blue Dress/ });

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));

      await vi.waitFor(() => expect(document.querySelector('[aria-busy="true"]')).not.toBeNull());
      expect(screen.getByRole('link', { name: /Blue Dress/ })).toBeInTheDocument();
      release();
      expect(await screen.findByRole('link', { name: /Page Two Dress/ })).toBeInTheDocument();
    });

    it('shows the not found page for an unknown category', async () => {
      renderShop('/shop/nope');

      expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    });

    it('loads the list again when Try again is pressed', async () => {
      let productCalls = 0;
      stubApi((url) => {
        if (url.startsWith('/api/categories')) return { body: { data: categories } };
        if (url.startsWith('/api/filters')) return { body: { data: filterOptions } };
        productCalls += 1;
        return productCalls === 1
          ? { status: 500, body: { error: { message: 'Something went wrong' } } }
          : { body: { data: { items: [productCard()], page: 1, limit: 12, total: 1 } } };
      });
      renderRoute(<ShopPage />, { path: '/shop/:category?', url: '/shop' });

      fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

      expect(await screen.findByRole('link', { name: /Blue Dress/ })).toBeInTheDocument();
    });
  });
});
