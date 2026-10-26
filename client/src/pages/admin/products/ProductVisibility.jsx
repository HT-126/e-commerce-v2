import { useState } from 'react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useUpdateProduct } from '../../../hooks/use-admin-products.js';

// Takes the product out of the shop, or puts it back. It changes only this one thing and saves at once, so
// it is not part of the form: an old form can never save a stale status and show a hidden product again.
// (There is no way to delete a product: old orders keep pointing to it.)
export default function ProductVisibility({ product }) {
  const update = useUpdateProduct(product.id);
  const [confirming, setConfirming] = useState(false);

  async function setShown(isActive) {
    try {
      await update.mutateAsync({ isActive });
      toast.success(isActive ? 'Product is now shown in the shop' : 'Product hidden from the shop');
    } catch {
      toast.error('Could not change the product. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      {product.isActive ? (
        <Button variant="outline" disabled={update.isPending} onClick={() => setConfirming(true)}>
          Hide from shop
        </Button>
      ) : (
        <Button disabled={update.isPending} onClick={() => setShown(true)}>
          Show in shop
        </Button>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        {product.isActive
          ? 'Hidden products leave the shop but stay in old orders. You can show it again any time.'
          : 'This product is hidden from the shop. Customers cannot see or buy it.'}
      </p>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Hide this product from the shop?"
        description="It disappears from the shop and its page shows Not found. Old orders keep it. You can show it again any time."
        confirmLabel="Yes, hide from shop"
        cancelLabel="Keep it shown"
        pending={update.isPending}
        onConfirm={() => setShown(false)}
      />
    </div>
  );
}
