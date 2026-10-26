import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubApi } from '../test-utils.jsx';
import {
  useCreateProduct,
  useCreateVariant,
  useUpdateProduct,
  useUpdateVariant,
} from './use-admin-products.js';

afterEach(() => vi.unstubAllGlobals());

// What the shop shows comes from these queries, so every change the admin saves must mark them stale.
const SHOP_AND_ADMIN_QUERIES = [['admin', 'products'], ['product'], ['products'], ['filters']];

function setup(answer = { body: { data: { id: 5 } } }) {
  stubApi(() => answer);
  const queryClient = new QueryClient();
  const invalidated = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const keys = () => invalidated.mock.calls.map(([filters]) => filters.queryKey);
  return { queryClient, wrapper, keys };
}

const SAVES = [
  ['creating a product', () => useCreateProduct(), (mutation) => mutation.mutateAsync({ title: 'New' })],
  ['saving a product', () => useUpdateProduct(5), (mutation) => mutation.mutateAsync({ title: 'Changed' })],
  ['hiding a product', () => useUpdateProduct(5), (mutation) => mutation.mutateAsync({ isActive: false })],
  [
    'adding a variant',
    () => useCreateVariant(5),
    (mutation) => mutation.mutateAsync({ sku: 'S-1', color: 'Black', size: 'M', stock: 1 }),
  ],
  [
    'changing a variant or its stock',
    () => useUpdateVariant(5),
    (mutation) => mutation.mutateAsync({ id: 11, changes: { stock: 0 } }),
  ],
];

describe('saving in the admin refreshes what the shop shows', () => {
  it.each(SAVES)('%s marks the admin lists, the shop products and the shop filters stale', async (_name, useHook, save) => {
    const { wrapper, keys } = setup();
    const { result } = renderHook(useHook, { wrapper });

    await act(() => save(result.current));

    for (const key of SHOP_AND_ADMIN_QUERIES) expect(keys()).toContainEqual(key);
  });

  it.each([
    ['adding a variant', () => useCreateVariant(5), (mutation) => mutation.mutateAsync({ sku: 'S-1', color: 'Black', size: 'M', stock: 1 })],
    ['changing a variant', () => useUpdateVariant(5), (mutation) => mutation.mutateAsync({ id: 11, changes: { stock: 0 } })],
  ])('%s also loads the product in the admin again, because variants come with it', async (_name, useHook, save) => {
    const { wrapper, keys } = setup();
    const { result } = renderHook(useHook, { wrapper });

    await act(() => save(result.current));

    expect(keys()).toContainEqual(['admin', 'product', '5']);
  });

  it('puts the saved product straight into the admin cache', async () => {
    const { queryClient, wrapper } = setup({ body: { data: { id: 5, title: 'Saved' } } });
    const { result } = renderHook(() => useUpdateProduct(5), { wrapper });

    await act(() => result.current.mutateAsync({ title: 'Saved' }));

    expect(queryClient.getQueryData(['admin', 'product', '5'])).toEqual({ id: 5, title: 'Saved' });
  });

  it.each(SAVES)('%s marks nothing stale when it fails', async (_name, useHook, save) => {
    const { wrapper, keys } = setup({ status: 500, body: { error: { message: 'Something went wrong' } } });
    const { result } = renderHook(useHook, { wrapper });

    await act(() => save(result.current).catch(() => {}));

    expect(keys()).toEqual([]);
  });
});
