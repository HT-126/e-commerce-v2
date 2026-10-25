import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { stubApi } from '../../../test-utils.jsx';
import ProductEditPage from './ProductEditPage.jsx';

afterEach(() => {
  vi.unstubAllGlobals();
  // Toasts live in one shared store, so one test's toast would still be on screen in the next.
  toast.dismiss();
});

const categories = [
  { id: 1, name: 'Tops', slug: 'tops' },
  { id: 3, name: 'Dresses', slug: 'dresses' },
];
const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };
const notFound = { status: 404, body: { error: { message: 'Not found', code: 'NOT_FOUND' } } };
const apiError = (status, code, details) => ({ status, body: { error: { message: 'x', code, details } } });

const aProduct = (overrides = {}) => ({
  id: 7,
  slug: 'linen-midi-dress',
  title: 'Linen Midi Dress',
  description: 'Light and airy.',
  highlights: ['Breathable', 'Relaxed fit'],
  stylingNote: null,
  categoryId: 3,
  category: { name: 'Dresses', slug: 'dresses' },
  priceCents: 5999,
  isActive: true,
  material: '100% linen',
  care: null,
  fit: null,
  length: null,
  closure: null,
  season: null,
  pattern: null,
  sizingNotes: null,
  ratingAvg: null,
  reviewCount: 0,
  images: [{ url: 'https://cdn.example/a.webp', alt: 'Front' }],
  variants: [{ id: 11, sku: 'SKU-1', color: 'Black', size: 'M', position: 0, stock: 5 }],
  ...overrides,
});

// A fake API. `product`: what `GET /api/admin/products/7` returns (a status object for an error).
// `save`: an answer for POST and PATCH of a product, instead of echoing it back.
function renderPage({ url = '/admin/products/7', product = aProduct(), save, categoriesAnswer } = {}) {
  const fetchMock = stubApi((requested, init) => {
    if (requested === '/api/categories') return categoriesAnswer ?? { body: { data: categories } };
    if (requested === '/api/admin/products' && init?.method === 'POST') {
      return save ?? { status: 201, body: { data: aProduct({ ...JSON.parse(init.body), id: 9, categoryId: JSON.parse(init.body).categoryId, category: { name: 'Dresses', slug: 'dresses' }, variants: [] }) } };
    }
    if (requested === '/api/admin/products/7' && init?.method === 'PATCH') {
      return save ?? { body: { data: { ...aProduct(), ...JSON.parse(init.body) } } };
    }
    if (requested.startsWith('/api/admin/products/')) return 'status' in product ? product : { body: { data: product } };
    return { status: 404, body: { error: { message: 'Not found' } } };
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/products/new" element={<ProductEditPage />} />
          <Route path="/admin/products/:id" element={<ProductEditPage />} />
          <Route path="/admin/products" element={<p>the products list</p>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

const writes = (fetchMock, method) => fetchMock.mock.calls.filter(([, init]) => init?.method === method);
const bodyOf = (call) => JSON.parse(call[1].body);
const field = (name) => screen.getByLabelText(name);
const save = () => screen.getByRole('button', { name: /^(Save changes|Create product)$/ });

function pickCategory(optionName) {
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Category' }), { key: 'Enter' });
  fireEvent.keyDown(screen.getByRole('option', { name: optionName }), { key: 'Enter' });
}

async function fillNewProduct() {
  await screen.findByRole('heading', { name: 'New product' });
  fireEvent.change(field('Title'), { target: { value: 'Linen Midi Dress' } });
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument());
  pickCategory('Dresses');
  fireEvent.change(field('Price (USD)'), { target: { value: '59.99' } });
  fireEvent.change(field('Photo 1 address'), { target: { value: 'https://cdn.example/a.webp' } });
}

describe('admin ProductEditPage: a new product', () => {
  it('says when the categories cannot be loaded, and lets the owner try again', async () => {
    renderPage({ url: '/admin/products/new', categoriesAnswer: failure });

    expect(await screen.findByText(/Could not load the categories\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows a blank form, Active on, and one photo row', async () => {
    renderPage({ url: '/admin/products/new' });

    expect(await screen.findByRole('heading', { name: 'New product' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('');
    expect(screen.getByRole('switch', { name: 'Active (shown in the shop)' })).toBeChecked();
    expect(screen.getAllByLabelText(/^Photo \d+ address$/)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Create product' })).toBeInTheDocument();
    expect(screen.queryByText('Colors, sizes and stock')).not.toBeInTheDocument();
  });

  it('suggests the slug from the title, until the owner types in the slug', async () => {
    renderPage({ url: '/admin/products/new' });
    await screen.findByRole('heading', { name: 'New product' });

    fireEvent.change(field('Title'), { target: { value: 'Linen Midi Dress!' } });
    expect(field('Slug')).toHaveValue('linen-midi-dress');

    fireEvent.change(field('Slug'), { target: { value: 'my-own-slug' } });
    fireEvent.change(field('Title'), { target: { value: 'A Different Title' } });
    expect(field('Slug')).toHaveValue('my-own-slug');
  });

  it('shows what is missing under each field, and sends nothing', async () => {
    const fetchMock = renderPage({ url: '/admin/products/new' });
    await screen.findByRole('heading', { name: 'New product' });

    fireEvent.click(save());

    expect(await screen.findByText('Enter a title')).toBeInTheDocument();
    expect(screen.getByText('Enter a slug')).toBeInTheDocument();
    // The select shows the same words as its placeholder, so ask for the message (a paragraph).
    expect(screen.getByText('Choose a category', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Enter a price like 59.99')).toBeInTheDocument();
    expect(screen.getByText('Enter the photo address')).toBeInTheDocument();
    expect(writes(fetchMock, 'POST')).toEqual([]);
  });

  it('shows the message next to the field it belongs to', async () => {
    renderPage({ url: '/admin/products/new' });
    await screen.findByRole('heading', { name: 'New product' });

    fireEvent.change(field('Price (USD)'), { target: { value: '0.00' } });
    fireEvent.change(field('Photo 1 address'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(save());

    expect(await screen.findByText('The price must be more than 0')).toBeInTheDocument();
    expect(screen.getByText('Use a web address that starts with http:// or https://')).toBeInTheDocument();
    expect(field('Price (USD)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('adds and removes photos, and keeps at least one', async () => {
    renderPage({ url: '/admin/products/new' });
    await screen.findByRole('heading', { name: 'New product' });
    expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Add photo' }));
    expect(screen.getAllByLabelText(/^Photo \d+ address$/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 2' }));

    expect(screen.getAllByLabelText(/^Photo \d+ address$/)).toHaveLength(1);
  });

  it('stops adding photos at 10', async () => {
    renderPage({ url: '/admin/products/new' });
    await screen.findByRole('heading', { name: 'New product' });

    for (let i = 0; i < 9; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Add photo' }));

    expect(screen.getAllByLabelText(/^Photo \d+ address$/)).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeDisabled();
  });

  it('creates the product with the price in cents, says so in a toast and opens its edit page', async () => {
    const fetchMock = renderPage({ url: '/admin/products/new' });
    await fillNewProduct();
    fireEvent.change(field('Highlights'), { target: { value: 'Breathable\n\n Relaxed fit ' } });

    fireEvent.click(save());

    expect(await screen.findByText('Product created. Add its colors and sizes below.')).toBeInTheDocument();
    expect(bodyOf(writes(fetchMock, 'POST')[0])).toMatchObject({
      title: 'Linen Midi Dress',
      slug: 'linen-midi-dress',
      categoryId: 3,
      priceCents: 5999,
      isActive: true,
      highlights: ['Breathable', 'Relaxed fit'],
      images: [{ url: 'https://cdn.example/a.webp', alt: '' }],
    });
    // The edit page of the new product, with its variants.
    expect(await screen.findByText('Colors, sizes and stock')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New product' })).not.toBeInTheDocument();
  });

  it('can create a product that is not active', async () => {
    const fetchMock = renderPage({ url: '/admin/products/new' });
    await fillNewProduct();

    fireEvent.click(screen.getByRole('switch', { name: 'Active (shown in the shop)' }));
    fireEvent.click(save());

    await screen.findByText('Product created. Add its colors and sizes below.');
    expect(bodyOf(writes(fetchMock, 'POST')[0]).isActive).toBe(false);
  });

  it('says under the slug when it is already used, and keeps everything typed', async () => {
    renderPage({ url: '/admin/products/new', save: apiError(409, 'SLUG_TAKEN') });
    await fillNewProduct();

    fireEvent.click(save());

    expect(await screen.findByText('This slug is already used by another product')).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Linen Midi Dress');
    expect(field('Price (USD)')).toHaveValue('59.99');
  });

  it('shows what the server refused under the field it names', async () => {
    renderPage({
      url: '/admin/products/new',
      save: apiError(400, 'VALIDATION_ERROR', [{ path: ['priceCents'], message: 'Too big' }]),
    });
    await fillNewProduct();

    fireEvent.click(save());

    expect(await screen.findByText('Too big')).toBeInTheDocument();
    expect(await screen.findByText('Please check the form')).toBeInTheDocument();
  });

  it('says so in a toast for any other failure, and the button works again', async () => {
    renderPage({ url: '/admin/products/new', save: failure });
    await fillNewProduct();

    fireEvent.click(save());

    expect(await screen.findByText('Could not save the product. Please try again.')).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });
});

describe('admin ProductEditPage: an existing product', () => {
  it('shows a loading state first', () => {
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('shows not found for an unknown product', async () => {
    renderPage({ product: notFound });

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute('href', '/admin/products');
  });

  it('shows an error with a retry button', async () => {
    renderPage({ product: failure });

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this product.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('fills the form from the product: the price in dollars, the highlights one per line', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Linen Midi Dress' })).toBeInTheDocument();
    expect(field('Title')).toHaveValue('Linen Midi Dress');
    expect(field('Slug')).toHaveValue('linen-midi-dress');
    expect(field('Price (USD)')).toHaveValue('59.99');
    expect(field('Highlights')).toHaveValue('Breathable\nRelaxed fit');
    expect(field('Material')).toHaveValue('100% linen');
    expect(field('Photo 1 address')).toHaveValue('https://cdn.example/a.webp');
    expect(screen.getByRole('switch', { name: 'Active (shown in the shop)' })).toBeChecked();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Dresses'));
  });

  it('does not touch the slug when the title changes', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1 });

    fireEvent.change(field('Title'), { target: { value: 'A New Title' } });

    expect(field('Slug')).toHaveValue('linen-midi-dress');
  });

  it('links to the product in the shop, and to its reviews', async () => {
    renderPage();

    expect(await screen.findByRole('link', { name: 'View in the shop' })).toHaveAttribute('href', '/products/linen-midi-dress');
    expect(screen.getByRole('link', { name: 'See its reviews' })).toHaveAttribute('href', '/admin/reviews?productId=7');
  });

  it('has no link to the shop for a hidden product', async () => {
    renderPage({ product: aProduct({ isActive: false }) });

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'View in the shop' })).not.toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('shows the variants under the form', async () => {
    renderPage();

    expect(await screen.findByText('Colors, sizes and stock')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Stock of SKU-1' })).toHaveValue('5');
  });

  it('saves the changes, says so in a toast, and the form shows the saved product', async () => {
    const fetchMock = renderPage();
    await screen.findByRole('heading', { level: 1 });

    fireEvent.change(field('Price (USD)'), { target: { value: '64.50' } });
    fireEvent.change(field('Care'), { target: { value: ' Wash cold ' } });
    fireEvent.click(save());

    expect(await screen.findByText('Product saved')).toBeInTheDocument();
    expect(bodyOf(writes(fetchMock, 'PATCH')[0])).toMatchObject({ priceCents: 6450, care: 'Wash cold', isActive: true });
  });

  it('sends an emptied optional field as null, so it is cleared', async () => {
    const fetchMock = renderPage();
    await screen.findByRole('heading', { level: 1 });

    fireEvent.change(field('Material'), { target: { value: '' } });
    fireEvent.click(save());

    await screen.findByText('Product saved');
    expect(bodyOf(writes(fetchMock, 'PATCH')[0]).material).toBeNull();
  });

  it('says under the slug when the new slug is already used', async () => {
    renderPage({ save: apiError(409, 'SLUG_TAKEN') });
    await screen.findByRole('heading', { level: 1 });

    fireEvent.change(field('Slug'), { target: { value: 'taken-slug' } });
    fireEvent.click(save());

    expect(await screen.findByText('This slug is already used by another product')).toBeInTheDocument();
  });

  describe('hiding the product', () => {
    const hide = () => fireEvent.click(screen.getByRole('switch', { name: 'Active (shown in the shop)' }));

    it('asks first, and "Keep it active" sends nothing', async () => {
      const fetchMock = renderPage();
      await screen.findByRole('heading', { level: 1 });

      hide();
      fireEvent.click(save());

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Hide this product?')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Keep it active' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(writes(fetchMock, 'PATCH')).toEqual([]);
    });

    it('hides it after "Yes, hide product"', async () => {
      const fetchMock = renderPage();
      await screen.findByRole('heading', { level: 1 });

      hide();
      fireEvent.click(save());
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, hide product' }));

      expect(await screen.findByText('Product saved')).toBeInTheDocument();
      expect(bodyOf(writes(fetchMock, 'PATCH')[0]).isActive).toBe(false);
    });

    it('keeps the dialog open, showing "Working...", until the product is saved', async () => {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const fetchMock = renderPage();
      const answer = fetchMock.getMockImplementation();
      fetchMock.mockImplementation(async (url, init) => {
        if (init?.method === 'PATCH') await gate;
        return answer(url, init);
      });
      await screen.findByRole('heading', { level: 1 });

      hide();
      fireEvent.click(save());
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, hide product' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(await within(dialog).findByRole('button', { name: 'Working...' })).toBeDisabled();
      release();
      expect(await screen.findByText('Product saved')).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('does not ask when other fields are saved and the product stays active', async () => {
      renderPage();
      await screen.findByRole('heading', { level: 1 });

      fireEvent.change(field('Title'), { target: { value: 'New title' } });
      fireEvent.click(save());

      expect(await screen.findByText('Product saved')).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('does not ask to show a hidden product again, or to save one that stays hidden', async () => {
      const fetchMock = renderPage({ product: aProduct({ isActive: false }) });
      await screen.findByRole('heading', { level: 1 });

      fireEvent.change(field('Title'), { target: { value: 'Still hidden' } });
      fireEvent.click(save());
      await screen.findByText('Product saved');
      hide();
      fireEvent.click(save());
      await waitFor(() => expect(writes(fetchMock, 'PATCH')).toHaveLength(2));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(bodyOf(writes(fetchMock, 'PATCH')[1]).isActive).toBe(true);
    });
  });
});
