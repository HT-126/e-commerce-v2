import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useLogout, useMe } from '../hooks/use-auth.js';
import { useCartCount } from '../hooks/use-cart.js';
import { useCategories } from '../hooks/use-catalog.js';
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './icons.jsx';

const baseLink = 'rounded-full px-1 py-2 text-sm hover:text-highlight';
const categoryLink = ({ isActive }) =>
  `${baseLink} ${isActive ? 'font-medium underline underline-offset-8' : ''}`;
const iconButton = 'flex size-11 items-center justify-center rounded-full hover:bg-panel';

// Only one panel is open at a time: 'menu' (phone), 'search' or 'account'.
export default function Header() {
  const [panel, setPanel] = useState(null);
  const headerRef = useRef(null);
  const searchButtonRef = useRef(null);
  const menuButtonRef = useRef(null);
  const accountButtonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: categories = [] } = useCategories();
  const { data: user, isPending: userLoading } = useMe();
  const logout = useLogout();
  const bagCount = useCartCount();

  const [signOutFailed, setSignOutFailed] = useState(false);

  const close = () => {
    setPanel(null);
    setSignOutFailed(false);
  };
  const toggle = (name) => {
    setSignOutFailed(false);
    setPanel((current) => (current === name ? null : name));
  };

  // An open panel closes on Escape (focus goes back to its button), a click outside, or Tab leaving the header.
  useEffect(() => {
    if (!panel) return undefined;

    const closeIfOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) setPanel(null);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      const buttons = { search: searchButtonRef, menu: menuButtonRef, account: accountButtonRef };
      buttons[panel].current?.focus();
      setPanel(null);
    };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('focusin', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('focusin', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [panel]);

  // An empty search shows all products again.
  function submitSearch(event) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get('q').trim();
    close();
    navigate(text ? `/shop?${new URLSearchParams({ q: text })}` : '/shop');
  }

  // If signing out fails the user is still signed in, so the panel stays open and says so.
  async function signOut() {
    setSignOutFailed(false);
    try {
      await logout.mutateAsync();
      close();
    } catch {
      setSignOutFailed(true);
    }
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
    // The Admin pages come with the Admin feature. Until then this link shows the "Page not found" page.
    user?.role === 'admin' && (
      <NavLink key="admin" to="/admin" className={categoryLink} onClick={close}>
        Admin
      </NavLink>
    ),
  ];

  return (
    <header ref={headerRef} className="mx-auto w-full max-w-7xl px-6 pt-4">
      <div className="flex items-center justify-between gap-4 rounded-full bg-white px-5 py-2 shadow-sm">
        <Link to="/" className="inline-flex min-h-11 items-center font-serif text-2xl" onClick={close}>
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
            aria-expanded={panel === 'search'}
            aria-controls={panel === 'search' ? 'header-search' : undefined}
            onClick={() => toggle('search')}
            className={iconButton}
          >
            <SearchIcon />
          </button>

          {userLoading ? (
            // Keeps the space while we find out who is signed in, so nothing jumps.
            <span className="size-11" aria-hidden="true" />
          ) : user ? (
            <button
              ref={accountButtonRef}
              type="button"
              aria-label="Account"
              aria-expanded={panel === 'account'}
              aria-controls={panel === 'account' ? 'account-menu' : undefined}
              onClick={() => toggle('account')}
              className={iconButton}
            >
              <UserIcon />
            </button>
          ) : (
            // After signing in the visitor comes back to this page.
            <Link
              to="/login"
              state={{ from: location.pathname + location.search }}
              aria-label="Sign in"
              onClick={close}
              className={iconButton}
            >
              <UserIcon />
            </Link>
          )}

          <Link
            to="/cart"
            aria-label={bagCount > 0 ? `Bag, ${bagCount} ${bagCount === 1 ? 'item' : 'items'}` : 'Bag'}
            onClick={close}
            className={`${iconButton} relative`}
          >
            <BagIcon />
            {bagCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-on-primary"
              >
                {bagCount > 99 ? '99+' : bagCount}
              </span>
            )}
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label={panel === 'menu' ? 'Close menu' : 'Open menu'}
            aria-expanded={panel === 'menu'}
            aria-controls={panel === 'menu' ? 'mobile-menu' : undefined}
            onClick={() => toggle('menu')}
            className={`${iconButton} xl:hidden`}
          >
            {panel === 'menu' ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {panel === 'search' && (
        <form
          id="header-search"
          role="search"
          onSubmit={submitSearch}
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

      {panel === 'account' && user && (
        <div id="account-menu" className="mt-2 ml-auto max-w-xs rounded-[28px] bg-white px-6 py-4 shadow-sm">
          <p className="font-serif text-xl">
            {user.firstName} {user.lastName}
          </p>
          <p className="break-all text-sm text-ink-soft">{user.email}</p>
          <div className="mt-3 border-t border-border pt-2">
            <button
              type="button"
              onClick={signOut}
              disabled={logout.isPending}
              className="min-h-11 w-full text-left text-sm hover:text-highlight disabled:opacity-50"
            >
              Sign out
            </button>
            {signOutFailed && (
              <p role="alert" className="pb-2 text-sm text-error">
                Could not sign out. Please try again.
              </p>
            )}
          </div>
        </div>
      )}

      {panel === 'menu' && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="mt-2 flex max-h-[calc(100dvh-7rem)] flex-col gap-1 overflow-auto rounded-[28px] bg-white px-6 py-4 shadow-sm xl:hidden"
        >
          {links}
        </nav>
      )}
    </header>
  );
}
