import Button from '../../components/Button.jsx';
import { useCart, useRemoveLine, useSetQuantity } from '../../hooks/use-cart.js';
import { formatMoney } from '../../lib/format-money.js';
import { FREE_SHIPPING_FROM_CENTS } from '../../lib/shipping.js';
import CartLine from './CartLine.jsx';

function CartSkeleton() {
  return (
    <div role="status" aria-label="Loading your bag" className="grid animate-pulse gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="h-44 rounded-[28px] bg-card" />
        <div className="h-44 rounded-[28px] bg-card" />
      </div>
      <div className="h-64 rounded-[28px] bg-card" />
    </div>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-lg font-medium' : 'text-sm'}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Totals count only lines that are `ok`. Paying comes with the next feature (Pay and orders), so a signed-in
// shopper only sees why checkout is blocked. A guest gets a way to sign in and come back here.
function Summary({ cart, isGuest }) {
  const { subtotalCents, shippingCents, totalCents, canCheckout } = cart;
  const missingForFree = FREE_SHIPPING_FROM_CENTS - subtotalCents;

  return (
    <aside className="h-fit rounded-[28px] bg-white p-6">
      <h2 className="font-serif text-2xl">Summary</h2>
      <dl className="mt-4 space-y-2">
        <Row label="Subtotal" value={formatMoney(subtotalCents)} />
        <Row label="Shipping" value={shippingCents === 0 ? 'Free' : formatMoney(shippingCents)} />
        <div className="border-t border-border pt-3">
          <Row label="Total" value={formatMoney(totalCents)} strong />
        </div>
      </dl>

      {shippingCents > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Add {formatMoney(missingForFree)} more for free shipping.
        </p>
      )}
      {!canCheckout && (
        <p className="mt-4 text-sm text-error">
          Some items are sold out or need a lower quantity. Fix them to check out.
        </p>
      )}
      {isGuest && (
        <Button to="/login" state={{ from: '/cart' }} className="mt-5 w-full min-h-[54px] text-base">
          Sign in to pay
        </Button>
      )}
    </aside>
  );
}

export default function CartPage() {
  const { cart, isLoading, isError, refetch, isGuest } = useCart();
  const setQuantity = useSetQuantity();
  const removeLine = useRemoveLine();
  const busy = setQuantity.isPending || removeLine.isPending;
  const changeFailed = setQuantity.isError || removeLine.isError;

  const changeQuantity = (variantId, quantity) => setQuantity.mutate({ variantId, quantity });
  const remove = (variantId) => removeLine.mutate({ variantId });

  return (
    <section>
      <h1 className="font-serif text-4xl">
        Your <span className="italic text-highlight">bag</span>
      </h1>

      <div className="mt-8">
        {isLoading ? (
          <CartSkeleton />
        ) : isError ? (
          <div role="alert" className="rounded-[28px] bg-card p-8 text-center">
            <p className="text-error">Could not load your bag.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : cart.lines.length === 0 ? (
          <div className="rounded-[28px] bg-card p-8 text-center">
            <p>Your bag is empty.</p>
            <Button to="/shop" className="mt-4">
              Continue shopping
            </Button>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {changeFailed && (
                <p role="alert" className="mb-4 rounded-2xl bg-white px-5 py-3 text-sm text-error">
                  Could not update your bag. Please try again.
                </p>
              )}
              <ul className="space-y-4">
                {cart.lines.map((line) => (
                  <CartLine
                    key={line.variantId}
                    line={line}
                    disabled={busy}
                    onQuantity={changeQuantity}
                    onRemove={remove}
                  />
                ))}
              </ul>
            </div>
            <Summary cart={cart} isGuest={isGuest} />
          </div>
        )}
      </div>
    </section>
  );
}
