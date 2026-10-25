import { useNavigate } from 'react-router';
import Button from '../../components/Button.jsx';
import { useCart, useRemoveLine, useSetQuantity } from '../../hooks/use-cart.js';
import { usePlaceOrder } from '../../hooks/use-orders.js';
import { formatMoney } from '../../lib/format-money.js';
import { FREE_SHIPPING_FROM_CENTS } from '../../lib/shipping.js';
import { useCartStore } from '../../stores/cart-store.js';
import CartLine from './CartLine.jsx';
import { describePayError } from './pay-errors.js';

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

function PayError({ error }) {
  const { message, items } = describePayError(error);
  return (
    <div role="alert" className="mt-4 text-sm text-error">
      <p>{message}</p>
      {items.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Totals count only lines that are `ok`. A signed-in shopper pays here; a guest gets a way to sign in
// and come back to the bag. `pay` is `{ onPay, pending, busy, error }`.
function Summary({ cart, isGuest, pay }) {
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
      {isGuest ? (
        <Button to="/login" state={{ from: '/cart' }} className="mt-5 w-full min-h-[54px] text-base">
          Sign in to pay
        </Button>
      ) : (
        <>
          <Button
            className="mt-5 w-full min-h-[54px] text-base"
            disabled={!canCheckout || pay.pending || pay.busy}
            onClick={pay.onPay}
          >
            {pay.pending ? 'Paying...' : `Pay ${formatMoney(totalCents)}`}
          </Button>
          {pay.error && <PayError error={pay.error} />}
        </>
      )}
    </aside>
  );
}

export default function CartPage() {
  const { cart, isLoading, isError, error, refetch, isGuest } = useCart();
  const clearBag = useCartStore((state) => state.clear);
  // The server refuses the browser bag (400): too many lines or a bad value. Trying again cannot help.
  const bagIsInvalid = isGuest && error?.status === 400;
  const setQuantity = useSetQuantity();
  const removeLine = useRemoveLine();
  const busy = setQuantity.isPending || removeLine.isPending;
  const changeFailed = setQuantity.isError || removeLine.isError;
  const placeOrder = usePlaceOrder();
  const navigate = useNavigate();

  // Changing the bag answers the message about the last "Pay": it no longer describes this bag.
  const changeQuantity = (variantId, quantity) => {
    placeOrder.reset();
    setQuantity.mutate({ variantId, quantity });
  };
  const remove = (variantId) => {
    placeOrder.reset();
    removeLine.mutate({ variantId });
  };

  // A refused order is shown under the button (`placeOrder.error`), so there is nothing to catch here.
  async function pay() {
    try {
      const order = await placeOrder.mutateAsync();
      navigate(`/orders/${order.orderNumber}`, { state: { placed: true } });
    } catch {
      // See above.
    }
  }

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
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => refetch()}>
                Try again
              </Button>
              {bagIsInvalid && (
                <Button variant="outline" onClick={clearBag}>
                  Clear bag
                </Button>
              )}
            </div>
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
            <Summary
              cart={cart}
              isGuest={isGuest}
              pay={{ onPay: pay, pending: placeOrder.isPending, busy, error: placeOrder.error }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
