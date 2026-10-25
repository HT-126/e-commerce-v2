import { Outlet, ScrollRestoration } from 'react-router';
import Footer from './Footer.jsx';
import Header from './Header.jsx';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
