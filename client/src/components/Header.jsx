import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useCategories } from '../hooks/use-catalog.js';
import { CloseIcon, MenuIcon, SearchIcon } from './icons.jsx';

const baseLink = 'rounded-full px-1 py-2 text-sm hover:text-highlight';
const categoryLink = ({ isActive }) =>
  `${baseLink} ${isActive ? 'font-medium underline underline-offset-8' : ''}`;

// Account and Bag icons come with the Accounts and Cart features, so there are no dead links yet.
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: categories = [] } = useCategories();
  const close = () => setMenuOpen(false);

  const links = [
    // A plain link: NavLink ignores the query string, so it would look active on every shop page.
    <Link key="new" to="/shop?sort=newest" className={baseLink} onClick={close}>
      New in
    </Link>,
    ...categories.map((c) => (
      <NavLink key={c.id} to={`/shop/${c.slug}`} className={categoryLink} onClick={close}>
        {c.name}
      </NavLink>
    )),
  ];

  return (
    <header className="mx-auto w-full max-w-7xl px-6 pt-4">
      <div className="flex items-center justify-between gap-4 rounded-full bg-white px-5 py-2 shadow-sm">
        <Link to="/" className="font-serif text-2xl" onClick={close}>
          Lumière
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-5 xl:flex">
          {links}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            to="/shop"
            aria-label="Search"
            className="flex size-11 items-center justify-center rounded-full hover:bg-panel"
          >
            <SearchIcon />
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-11 items-center justify-center rounded-full hover:bg-panel xl:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="mt-2 flex flex-col gap-1 rounded-[28px] bg-white px-6 py-4 shadow-sm xl:hidden"
        >
          {links}
        </nav>
      )}
    </header>
  );
}
