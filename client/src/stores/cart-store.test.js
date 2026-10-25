import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cart-store.js';

const { add, setQuantity, remove, clear } = useCartStore.getState();
const items = () => useCartStore.getState().items;

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

describe('useCartStore', () => {
  it('adds a new variant', () => {
    add(10, 2);

    expect(items()).toEqual([{ variantId: 10, quantity: 2 }]);
  });

  it('adds to the quantity of a variant that is already there', () => {
    add(10, 2);
    add(11, 1);
    add(10, 3);

    expect(items()).toEqual([
      { variantId: 10, quantity: 5 },
      { variantId: 11, quantity: 1 },
    ]);
  });

  it('never goes above 9', () => {
    add(10, 8);
    add(10, 4);
    add(11, 12);

    expect(items()).toEqual([
      { variantId: 10, quantity: 9 },
      { variantId: 11, quantity: 9 },
    ]);
  });

  it('sets the quantity of one variant', () => {
    add(10, 2);
    add(11, 2);

    setQuantity(11, 6);

    expect(items()).toEqual([
      { variantId: 10, quantity: 2 },
      { variantId: 11, quantity: 6 },
    ]);
  });

  it('removes one variant', () => {
    add(10, 1);
    add(11, 1);

    remove(10);

    expect(items()).toEqual([{ variantId: 11, quantity: 1 }]);
  });

  it('clears everything', () => {
    add(10, 1);
    add(11, 1);

    clear();

    expect(items()).toEqual([]);
  });

  it('saves the items in the browser, and nothing else', () => {
    add(10, 2);

    const saved = JSON.parse(localStorage.getItem('lumiere-cart'));

    expect(saved.state).toEqual({ items: [{ variantId: 10, quantity: 2 }] });
  });

  it('loads the saved items again', async () => {
    localStorage.setItem(
      'lumiere-cart',
      JSON.stringify({ state: { items: [{ variantId: 4, quantity: 3 }] }, version: 0 }),
    );

    await useCartStore.persist.rehydrate();

    expect(items()).toEqual([{ variantId: 4, quantity: 3 }]);
  });
});
