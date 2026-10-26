import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import CartSync from './components/CartSync.jsx';
import Layout from './components/Layout.jsx';
import RequireUser from './components/RequireUser.jsx';
import CartPage from './pages/cart/CartPage.jsx';
import HomePage from './pages/home/HomePage.jsx';
import AuthLayout from './pages/auth/AuthLayout.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import OrderPage from './pages/orders/OrderPage.jsx';
import OrdersPage from './pages/orders/OrdersPage.jsx';
import ProductPage from './pages/product/ProductPage.jsx';
import ShopPage from './pages/shop/ShopPage.jsx';
import { createQueryClient } from './lib/query-client.js';
import './index.css';

const queryClient = createQueryClient();

// Admin pages load only when one is opened, so Radix, the table library and the other admin code are not part of
// the shop's first load.
const lazyPage = (load) => ({ lazy: async () => ({ Component: (await load()).default }) });

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/shop', element: <ShopPage /> },
      { path: '/shop/:category', element: <ShopPage /> },
      { path: '/products/:slug', element: <ProductPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/orders/:orderNumber', element: <RequireUser><OrderPage /></RequireUser> },
      { path: '/account/orders', element: <RequireUser><OrdersPage /></RequireUser> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // The owner's area. `AdminRoot` checks the role and holds the layout; the pages are its children.
  {
    path: '/admin',
    ...lazyPage(() => import('./pages/admin/AdminRoot.jsx')),
    HydrateFallback: () => <div className="min-h-screen bg-page" />,
    children: [
      { index: true, element: <Navigate to="/admin/products" replace /> },
      { path: 'products', ...lazyPage(() => import('./pages/admin/products/ProductsPage.jsx')) },
      { path: 'products/new', ...lazyPage(() => import('./pages/admin/products/ProductEditPage.jsx')) },
      { path: 'products/:id', ...lazyPage(() => import('./pages/admin/products/ProductEditPage.jsx')) },
      { path: 'orders', ...lazyPage(() => import('./pages/admin/orders/OrdersPage.jsx')) },
      { path: 'orders/:orderNumber', ...lazyPage(() => import('./pages/admin/orders/OrderDetailPage.jsx')) },
      { path: 'reviews', ...lazyPage(() => import('./pages/admin/reviews/ReviewsPage.jsx')) },
    ],
  },
  // Sign in and register have their own slim layout (no shop menu, no footer). Their code (the form
  // libraries) loads only when one of these pages is opened, so the shop stays light.
  {
    element: <AuthLayout />,
    // Shown while the page's code loads on a first visit: just the page color, so nothing flashes.
    HydrateFallback: () => <div className="min-h-screen bg-page" />,
    children: [
      {
        path: '/login',
        lazy: async () => ({ Component: (await import('./pages/auth/LoginPage.jsx')).default }),
      },
      {
        path: '/register',
        lazy: async () => ({ Component: (await import('./pages/auth/RegisterPage.jsx')).default }),
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CartSync />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
