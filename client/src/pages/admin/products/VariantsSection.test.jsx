import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { renderRoute, stubApi } from '../../../test-utils.jsx';
import VariantsSection from './VariantsSection.jsx';

afterEach(() => {
  vi.unstubAllGlobals();
  // Toasts live in one shared store, so one test's toast would still be on screen in the next.
  toast.dismiss();
});

const failure = { status: 500, body: { error: { message: 'Something went wrong' } } };
const conflict = (code) => ({ status: 409, body: { error: { message: 'x', code } } });

const variant = (overrides = {}) => ({ id: 11, sku: 'SKU-1', color: 'Black', size: 'M', position: 0, stock: 5, ...overrides });
const product = (variants) => ({ id: 3, variants });

// A fake API: PATCH /api/admin/variants/:id and POST /api/admin/products/:id/variants. `answer` replaces the reply.
function renderVariants(variants, answer) {
  const fetchMock = stubApi((url, init) => {
    if (answer) return answer;
    const body = JSON.parse(init.body);
    return { status: init.method === 'POST' ? 201 : 200, body: { data: { ...variant(), ...body } } };
  });
  renderRoute(
    <>
      <VariantsSection product={product(variants)} />
      <Toaster />
    </>,
    { path: '/admin/products/:id', url: '/admin/products/3' },
  );
  return fetchMock;
}
const sent = (fetchMock) => fetchMock.mock.calls.map(([url, init]) => [init.method, url, JSON.parse(init.body)]);

const stockBox = (sku = 'SKU-1') => screen.getByRole('textbox', { name: `Stock of ${sku}` });
const saveButton = (sku = 'SKU-1') => screen.getByRole('button', { name: `Save ${sku}` });

describe('VariantsSection: the variants of a product', () => {
  it('says when there are none, and what customers see then', () => {
    renderVariants([]);

    expect(screen.getByText(/no colors or sizes yet/)).toBeInTheDocument();
    expect(screen.getByText(/sold out until you add one/)).toBeInTheDocument();
  });

  it('shows each variant with its SKU, color, size and stock', () => {
    renderVariants([variant(), variant({ id: 12, sku: 'SKU-2', color: 'Red', size: 'S', stock: 0 })]);

    expect(screen.getByText('SKU-1')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Color of SKU-1' })).toHaveValue('Black');
    expect(screen.getByRole('textbox', { name: 'Size of SKU-1' })).toHaveValue('M');
    expect(stockBox('SKU-1')).toHaveValue('5');
    expect(stockBox('SKU-2')).toHaveValue('0');
  });

  it('keeps Save off until something is changed, and off again when the change is undone', () => {
    renderVariants([variant()]);
    expect(saveButton()).toBeDisabled();

    fireEvent.change(stockBox(), { target: { value: '6' } });
    expect(saveButton()).toBeEnabled();

    fireEvent.change(stockBox(), { target: { value: '5' } });
    expect(saveButton()).toBeDisabled();
  });

  describe('changing a variant', () => {
    it('sets an exact stock number, sends only what changed, and says so in a toast', async () => {
      const fetchMock = renderVariants([variant()]);

      fireEvent.change(stockBox(), { target: { value: '0' } });
      fireEvent.click(saveButton());

      expect(await screen.findByText('Variant saved')).toBeInTheDocument();
      expect(sent(fetchMock)).toEqual([['PATCH', '/api/admin/variants/11', { stock: 0 }]]);
    });

    it('shows what the server saved in the boxes ("007" becomes 7)', async () => {
      renderVariants([variant()]);

      fireEvent.change(stockBox(), { target: { value: '007' } });
      fireEvent.click(saveButton());

      await screen.findByText('Variant saved');
      expect(stockBox()).toHaveValue('7');
    });

    it('sends the color and the size when those are changed', async () => {
      const fetchMock = renderVariants([variant()]);

      fireEvent.change(screen.getByRole('textbox', { name: 'Color of SKU-1' }), { target: { value: ' Navy ' } });
      fireEvent.change(screen.getByRole('textbox', { name: 'Size of SKU-1' }), { target: { value: 'L' } });
      fireEvent.click(saveButton());

      await screen.findByText('Variant saved');
      expect(sent(fetchMock)[0][2]).toEqual({ color: 'Navy', size: 'L' });
    });

    it.each([
      ['below 0', '-1'],
      ['a fraction', '1.5'],
      ['letters', 'abc'],
      ['empty', ''],
      ['too long', '12345678'],
    ])('does not send a stock of %s, and says what is wrong', async (_name, value) => {
      const fetchMock = renderVariants([variant()]);

      fireEvent.change(stockBox(), { target: { value } });
      fireEvent.click(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent('Stock must be a whole number, 0 or more.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not send an empty color or size', async () => {
      const fetchMock = renderVariants([variant()]);

      fireEvent.change(screen.getByRole('textbox', { name: 'Color of SKU-1' }), { target: { value: '  ' } });
      fireEvent.click(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent('Color and size cannot be empty.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('says when the color and size are already used by another variant of the product', async () => {
      renderVariants([variant()], conflict('VARIANT_TAKEN'));

      fireEvent.change(screen.getByRole('textbox', { name: 'Size of SKU-1' }), { target: { value: 'S' } });
      fireEvent.click(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'SKU-1: This product already has a variant with this color and size.',
      );
    });

    it('says so for any other failure, and lets the owner try again', async () => {
      renderVariants([variant()], failure);

      fireEvent.change(stockBox(), { target: { value: '7' } });
      fireEvent.click(saveButton());

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the variant. Please try again.');
      expect(saveButton()).toBeEnabled();
    });

    it('changes one variant without touching the other', async () => {
      const fetchMock = renderVariants([variant(), variant({ id: 12, sku: 'SKU-2', color: 'Red', stock: 9 })]);

      fireEvent.change(stockBox('SKU-2'), { target: { value: '8' } });
      expect(saveButton('SKU-1')).toBeDisabled();
      fireEvent.click(saveButton('SKU-2'));

      await screen.findByText('Variant saved');
      expect(sent(fetchMock)).toEqual([['PATCH', '/api/admin/variants/12', { stock: 8 }]]);
    });
  });

  describe('adding a variant', () => {
    const fill = (values) => {
      for (const [label, value] of Object.entries(values)) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
      }
    };

    it('sends the SKU, color, size and stock, says so in a toast, and clears the form', async () => {
      const fetchMock = renderVariants([]);

      fill({ SKU: ' NEW-1 ', Color: 'Navy Blue', Size: 'M', Stock: '6' });
      fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));

      expect(await screen.findByText('Variant added')).toBeInTheDocument();
      expect(sent(fetchMock)).toEqual([
        ['POST', '/api/admin/products/3/variants', { sku: 'NEW-1', color: 'Navy Blue', size: 'M', stock: 6 }],
      ]);
      await waitFor(() => expect(screen.getByLabelText('SKU')).toHaveValue(''));
      expect(screen.getByLabelText('Stock')).toHaveValue('0');
    });

    it('does not send a stock that is not a whole number, 0 or more', async () => {
      const fetchMock = renderVariants([]);

      fill({ SKU: 'NEW-1', Color: 'Black', Size: 'M', Stock: '-3' });
      fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Stock must be a whole number, 0 or more.');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('says when the SKU is already used', async () => {
      renderVariants([], conflict('SKU_TAKEN'));

      fill({ SKU: 'NEW-1', Color: 'Black', Size: 'M', Stock: '1' });
      fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('This SKU is already used by another variant.');
      expect(screen.getByLabelText('SKU')).toHaveValue('NEW-1');
    });

    it('says when the color and size are already used', async () => {
      renderVariants([], conflict('VARIANT_TAKEN'));

      fill({ SKU: 'NEW-1', Color: 'Black', Size: 'M', Stock: '1' });
      fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'This product already has a variant with this color and size.',
      );
    });

    it('says so for any other failure, and keeps what was typed', async () => {
      renderVariants([], failure);

      fill({ SKU: 'NEW-1', Color: 'Black', Size: 'M', Stock: '1' });
      fireEvent.click(screen.getByRole('button', { name: 'Add variant' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the variant. Please try again.');
      expect(screen.getByLabelText('Color')).toHaveValue('Black');
    });
  });
});
