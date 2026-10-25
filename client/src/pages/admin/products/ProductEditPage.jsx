import { Link, useParams } from 'react-router';
import StatusBadge from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminProduct } from '../../../hooks/use-admin-products.js';
import ProductForm from './ProductForm.jsx';
import VariantsSection from './VariantsSection.jsx';

// `/admin/products/new` has no id: a blank form. `/admin/products/:id` loads the product and shows its
// variants (colors, sizes and stock) under the form.
export default function ProductEditPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const { data: product, isPending, isError, error, refetch } = useAdminProduct(id, { enabled: !isNew });

  const back = (
    <Link to="/admin/products" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
      ← Products
    </Link>
  );

  if (isNew) {
    return (
      <section className="max-w-4xl">
        {back}
        <h1 className="mt-2 font-serif text-3xl">New product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save it first, then add its colors and sizes.
        </p>
        <div className="mt-6">
          <ProductForm key="new" />
        </div>
      </section>
    );
  }

  if (isPending) return <p role="status" className="text-muted-foreground">Loading...</p>;
  if (isError && error.status === 404) {
    return (
      <section>
        <h1 className="font-serif text-3xl">Product not found</h1>
        <Link to="/admin/products" className="mt-4 inline-block underline underline-offset-4">
          Back to products
        </Link>
      </section>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="rounded-xl bg-card p-8 text-center">
        <p className="text-destructive">Could not load this product.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section className="max-w-4xl">
      {back}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl">{product.title}</h1>
        <StatusBadge status={product.isActive ? 'active' : 'hidden'} />
      </div>
      <p className="mt-2 flex flex-wrap gap-4 text-sm">
        {product.isActive && (
          <Link to={`/products/${product.slug}`} className="underline underline-offset-4">
            View in the shop
          </Link>
        )}
        <Link to={`/admin/reviews?productId=${product.id}`} className="underline underline-offset-4">
          See its reviews
        </Link>
      </p>
      <div className="mt-6 space-y-6">
        {/* `key` gives each product its own form, so the values of one never carry over to the next. */}
        <ProductForm key={product.id} product={product} />
        <VariantsSection product={product} />
      </div>
    </section>
  );
}
