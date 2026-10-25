import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreateVariant, useUpdateVariant } from '../../../hooks/use-admin-products.js';
import { ApiError } from '../../../lib/api.js';

const WHOLE_NUMBER = /^\d{1,7}$/;
const STOCK_MESSAGE = 'Stock must be a whole number, 0 or more.';
const TAKEN_MESSAGE = 'This product already has a variant with this color and size.';

// What to tell the owner when the server refused a variant.
function variantError(error) {
  if (error instanceof ApiError && error.code === 'VARIANT_TAKEN') return TAKEN_MESSAGE;
  if (error instanceof ApiError && error.code === 'SKU_TAKEN') return 'This SKU is already used by another variant.';
  if (error instanceof ApiError && error.status === 400) return 'Please check the values and try again.';
  return 'Could not save the variant. Please try again.';
}

// One variant: its SKU (fixed), and its color, size and stock, which the owner can change. The stock is an
// exact number, not "plus or minus".
function VariantRow({ variant, productId }) {
  const update = useUpdateVariant(productId);
  const [color, setColor] = useState(variant.color);
  const [size, setSize] = useState(variant.size);
  const [stock, setStock] = useState(String(variant.stock));
  const [error, setError] = useState(null);
  const changed = color.trim() !== variant.color || size.trim() !== variant.size || stock !== String(variant.stock);

  async function save() {
    setError(null);
    if (!WHOLE_NUMBER.test(stock)) return setError(STOCK_MESSAGE);
    if (!color.trim() || !size.trim()) return setError('Color and size cannot be empty.');

    const changes = {};
    if (color.trim() !== variant.color) changes.color = color.trim();
    if (size.trim() !== variant.size) changes.size = size.trim();
    if (stock !== String(variant.stock)) changes.stock = Number(stock);

    try {
      await update.mutateAsync({ id: variant.id, changes });
      toast.success('Variant saved');
    } catch (failure) {
      setError(variantError(failure));
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
        <TableCell>
          <Input aria-label={`Color of ${variant.sku}`} value={color} onChange={(e) => setColor(e.target.value)} maxLength={60} />
        </TableCell>
        <TableCell>
          <Input aria-label={`Size of ${variant.sku}`} value={size} onChange={(e) => setSize(e.target.value)} maxLength={20} className="w-24" />
        </TableCell>
        <TableCell>
          <Input
            aria-label={`Stock of ${variant.sku}`}
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-24"
          />
        </TableCell>
        <TableCell>
          <Button size="sm" aria-label={`Save ${variant.sku}`} disabled={!changed || update.isPending} onClick={save}>
            {update.isPending ? 'Saving...' : 'Save'}
          </Button>
        </TableCell>
      </TableRow>
      {error && (
        <TableRow>
          <TableCell colSpan={5} role="alert" className="text-sm text-destructive">
            {variant.sku}: {error}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

const EMPTY = { sku: '', color: '', size: '', stock: '0' };

function AddVariant({ productId }) {
  const create = useCreateVariant(productId);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState(null);
  const set = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError(null);
    if (!WHOLE_NUMBER.test(values.stock)) return setError(STOCK_MESSAGE);

    try {
      await create.mutateAsync({
        sku: values.sku.trim(),
        color: values.color.trim(),
        size: values.size.trim(),
        stock: Number(values.stock),
      });
      toast.success('Variant added');
      setValues(EMPTY);
    } catch (failure) {
      setError(variantError(failure));
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t pt-6">
      <h3 className="font-medium">Add a variant</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="new-sku">SKU</Label>
          <Input id="new-sku" value={values.sku} onChange={set('sku')} required maxLength={40} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-color">Color</Label>
          <Input id="new-color" value={values.color} onChange={set('color')} required maxLength={60} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-size">Size</Label>
          <Input id="new-size" value={values.size} onChange={set('size')} required maxLength={20} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-stock">Stock</Label>
          <Input id="new-stock" inputMode="numeric" value={values.stock} onChange={set('stock')} required />
        </div>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Adding...' : 'Add variant'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

// The colors and sizes of a product, and how many of each there are. The shop shows a color or size as sold
// out when its stock is 0.
export default function VariantsSection({ product }) {
  return (
    <section className="rounded-xl border bg-white p-6">
      <h2 className="font-medium">Colors, sizes and stock</h2>
      {product.variants.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          This product has no colors or sizes yet. Customers see it as sold out until you add one.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>
                  <span className="sr-only">Save</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants.map((variant) => (
                <VariantRow key={variant.id} variant={variant} productId={product.id} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AddVariant productId={product.id} />
    </section>
  );
}
