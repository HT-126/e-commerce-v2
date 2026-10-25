import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter } from 'react-router';
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
import './index.css';

const queryClient = new QueryClient();

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
