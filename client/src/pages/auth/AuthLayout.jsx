import { Link, Outlet, ScrollRestoration } from 'react-router';
import Button from '../../components/Button.jsx';

// The sign in and register pages have their own slim top bar (no shop menu, no footer), like the design.
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="mx-auto w-full max-w-7xl px-6 pt-4">
        <div className="flex items-center justify-between gap-4 rounded-full bg-white px-5 py-2 shadow-sm">
          <Link to="/" className="inline-flex min-h-11 items-center font-serif text-2xl">
            Lumière
          </Link>
          <Button to="/shop" variant="outline">
            Back to shop
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-6 py-5">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}
