import { Link } from 'react-router';
import { useCategories } from '../hooks/use-catalog.js';

// Account and Help columns come with their pages.
export default function Footer() {
  const { data: categories = [] } = useCategories();

  return (
    <footer className="mt-20 bg-footer text-on-primary">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12 md:flex-row md:justify-between">
        <div>
          <p className="font-serif text-3xl">Lumière</p>
          <p className="mt-2 text-sm text-accent-light">Women&apos;s clothing in easy, wearable shapes.</p>
        </div>

        {categories.length > 0 && (
          <nav aria-label="Shop">
            <p className="text-xs font-medium uppercase tracking-widest text-accent-light">Shop</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link to={`/shop/${c.slug}`} className="hover:underline">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-6 py-5 text-xs text-accent-light">
          Product data: Women&apos;s Fashion Catalog Open Data (MIT license)
        </p>
      </div>
    </footer>
  );
}
