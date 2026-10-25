import { useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router';
import { useCategories } from '../hooks/use-catalog.js';
import { CloseIcon, MenuIcon, SearchIcon } from './icons.jsx';

const baseLink = 'rounded-full px-1 py-2 text-sm hover:text-highlight';
const categoryLink = ({ isActive }) =>
  `${baseLink} ${isActive ? 'font-medium underline underline-offset-8' : ''}`;

// Account and Bag icons come with the Accounts and Cart features, so there are no dead links yet.
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButtonRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: categories = [] } = useCategories();
  const close = () => {
    setMenuOpen(false);
    setSearchOpen(false);
  };

  function toggleMenu() {
    setSearchOpen(false);
    setMenuOpen((open) => !open);
  }

  function toggleSearch() {
    setMenuOpen(false);
    setSearchOpen((open) => !open);
  }

  // An empty search shows all products again.
  function submitSearch(event) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get('q').trim();
    setSearchOpen(false);
    navigate(text ? `/shop?${new URLSearchParams({ q: text })}` : '/shop');
  }

  function closeSearchOnEscape(event) {
    if (event.key !== 'Escape') return;
    setSearchOpen(false);
    searchButtonRef.current?.focus();
  }

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
          <button
            ref={searchButtonRef}
            type="button"
            aria-label="Search"
            aria-expanded={searchOpen}
            aria-controls="header-search"
            onClick={toggleSearch}
            className="flex size-11 items-center justify-center rounded-full hover:bg-panel"
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={toggleMenu}
            className="flex size-11 items-center justify-center rounded-full hover:bg-panel xl:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form
          id="header-search"
          role="search"
          onSubmit={submitSearch}
          onKeyDown={closeSearchOnEscape}
          className="mt-2 flex items-center gap-2 rounded-full bg-white px-5 py-2 shadow-sm"
        >
          <SearchIcon className="size-5 shrink-0 text-ink-soft" />
          <input
            autoFocus
            type="search"
            name="q"
            defaultValue={searchParams.get('q') ?? ''}
            placeholder="Search by title"
            aria-label="Search by title"
            maxLength={100}
            className="min-h-11 flex-1 bg-transparent text-sm outline-none"
          />
        </form>
      )}

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
