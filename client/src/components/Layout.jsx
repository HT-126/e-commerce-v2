import { Link, Outlet } from 'react-router';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
          <Link to="/" className="font-serif text-2xl">
            Lumière
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <Outlet />
      </main>

      <footer className="bg-footer text-on-primary">
        <div className="mx-auto max-w-7xl px-6 py-6 text-sm">
          Product data: Women&apos;s Fashion Catalog Open Data (MIT license)
        </div>
      </footer>
    </div>
  );
}
