import { useMergeGuestCart } from '../hooks/use-cart.js';

// Renders nothing. It sits at the root so the guest bag is merged whichever page the user lands on
// after signing in, and retried on any page load.
export default function CartSync() {
  useMergeGuestCart();
  return null;
}
