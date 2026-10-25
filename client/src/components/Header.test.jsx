import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, stubApi } from '../test-utils.jsx';
import Header from './Header.jsx';

afterEach(() => vi.unstubAllGlobals());

function Where() {
  const { pathname, search, state } = useLocation();
  return <p data-testid="where">{pathname + search + (state ? ` ${JSON.stringify(state)}` : '')}</p>;
}

const categories = [
  { id: 1, name: 'Tops', slug: 'tops' },
  { id: 2, name: 'Dresses', slug: 'dresses' },
];
const guest = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };

// `user`: who is signed in (null: a guest). `onLogout`: what the sign out request answers.
function renderHeader(url = '/', { user = null, logout = { status: 204 } } = {}) {
  const fetchMock = stubApi((requested) => {
    if (requested === '/api/categories') return { body: { data: categories } };
    if (requested === '/api/auth/me') return user ? { body: { data: { user } } } : guest;
    if (requested === '/api/auth/logout') return logout;
    return { body: { data: [] } };
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Header />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

const where = () => screen.getByTestId('where').textContent;

describe('Header', () => {
  it('links to New in and each category', async () => {
    renderHeader();

    expect(await screen.findByRole('link', { name: 'Dresses' })).toHaveAttribute('href', '/shop/dresses');
    expect(screen.getByRole('link', { name: 'New in' })).toHaveAttribute('href', '/shop?sort=newest');
  });

  it('closes the menu on Escape and gives the focus back to its button', async () => {
    renderHeader();
    await screen.findByRole('link', { name: 'Dresses' });
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });

  it('closes the menu on a click outside the header', async () => {
    renderHeader();
    await screen.findByRole('link', { name: 'Dresses' });
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    fireEvent.pointerDown(document.body);

    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
  });

  it('opens and closes the menu on small screens', async () => {
    renderHeader();
    await screen.findByRole('link', { name: 'Dresses' });

    // Only the wide-screen nav exists until the menu is opened.
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getAllByRole('link', { name: 'Tops' })[1]);
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
  });

  describe('search', () => {
    it('opens a search field from the Search button', () => {
      renderHeader();
      const button = screen.getByRole('button', { name: 'Search' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('searchbox', { name: 'Search by title' })).toHaveFocus();
    });

    it('goes to the shop with the search text, and closes the field', () => {
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  midi dress ' } });
      fireEvent.submit(screen.getByRole('search'));

      expect(where()).toBe('/shop?q=midi+dress');
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('an empty search shows all products', () => {
      renderHeader('/shop?q=dress');
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '   ' } });
      fireEvent.submit(screen.getByRole('search'));

      expect(where()).toBe('/shop');
    });

    it('starts with the current search text when the shop already has one', () => {
      renderHeader('/shop?q=wrap');
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      expect(screen.getByRole('searchbox')).toHaveValue('wrap');
    });

    it('closes on Escape and puts the focus back on the button', () => {
      renderHeader();
      const button = screen.getByRole('button', { name: 'Search' });
      fireEvent.click(button);

      fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(button).toHaveFocus();
      expect(where()).toBe('/');
    });

    it('the Search button points at the field only while it is open', () => {
      renderHeader();
      const button = screen.getByRole('button', { name: 'Search' });
      expect(button).not.toHaveAttribute('aria-controls');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-controls', 'header-search');
      expect(document.getElementById('header-search')).not.toBeNull();
    });

    it('closes on a click outside the header, but not on a click inside it', () => {
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      fireEvent.pointerDown(screen.getByRole('searchbox'));
      expect(screen.getByRole('searchbox')).toBeInTheDocument();

      fireEvent.pointerDown(document.body);
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('closes when Tab moves focus out of the header', () => {
      renderHeader();
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      fireEvent.focusIn(document.body);

      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('opening the menu closes the search, and the other way round', async () => {
      renderHeader();
      await screen.findByRole('link', { name: 'Dresses' });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
    });
  });

  describe('Account', () => {
    it('a guest gets a Sign in link that remembers the page, so signing in comes back to it', async () => {
      renderHeader('/shop?q=dress');

      const link = await screen.findByRole('link', { name: 'Sign in' });
      expect(link).toHaveAttribute('href', '/login');
      fireEvent.click(link);

      expect(where()).toBe('/login {"from":"/shop?q=dress"}');
    });

    it('shows neither Sign in nor Account while it is not known who is signed in (nothing flickers)', () => {
      renderHeader();

      expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Account' })).not.toBeInTheDocument();
    });

    it('a signed-in user gets an Account button instead of the Sign in link', async () => {
      renderHeader('/', { user: aUser() });

      expect(await screen.findByRole('button', { name: 'Account' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    });

    it('the Account panel shows the name and email, and Sign out', async () => {
      renderHeader('/', { user: aUser({ firstName: 'Anna', lastName: 'Kim', email: 'anna@example.com' }) });

      fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

      expect(screen.getByText('Anna Kim')).toBeInTheDocument();
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Account' })).toHaveAttribute(
        'aria-controls',
        'account-menu',
      );
    });

    it('a customer sees no Admin link', async () => {
      renderHeader('/', { user: aUser({ role: 'customer' }) });
      await screen.findByRole('button', { name: 'Account' });

      expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    });

    it('an admin sees an Admin link, also in the phone menu', async () => {
      renderHeader('/', { user: aUser({ role: 'admin' }) });

      expect(await screen.findByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(screen.getAllByRole('link', { name: 'Admin' })).toHaveLength(2);
    });

    it('Sign out sends the request, closes the panel, and the header shows the Sign in link again', async () => {
      const fetchMock = renderHeader('/', { user: aUser() });
      fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

      expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
      expect(
        fetchMock.mock.calls.some(([url, init]) => url === '/api/auth/logout' && init.method === 'POST'),
      ).toBe(true);
      expect(screen.queryByText('anna@example.com')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Account' })).not.toBeInTheDocument();
    });

    it('Sign out also works when the session had already ended (a 401 answer)', async () => {
      renderHeader('/', { user: aUser(), logout: guest });
      fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

      expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('a failed Sign out (server error) keeps the user signed in, keeps the panel open, and says so', async () => {
      renderHeader('/', {
        user: aUser(),
        logout: { status: 500, body: { error: { message: 'Something went wrong' } } },
      });
      fireEvent.click(await screen.findByRole('button', { name: 'Account' }));

      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out. Please try again.');
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    });

    it('a failed Sign out (no network) also keeps the user signed in', async () => {
      renderHeader('/', { user: aUser() });
      fireEvent.click(await screen.findByRole('button', { name: 'Account' }));
      const real = globalThis.fetch;
      vi.stubGlobal(
        'fetch',
        vi.fn((url, init) =>
          url === '/api/auth/logout' ? Promise.reject(new TypeError('Failed to fetch')) : real(url, init),
        ),
      );

      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out');
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();
    });

    it('the failure message is gone when the panel is closed and opened again', async () => {
      renderHeader('/', { user: aUser(), logout: { status: 500, body: { error: { message: 'x' } } } });
      const button = await screen.findByRole('button', { name: 'Account' });
      fireEvent.click(button);
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
      await screen.findByRole('alert');

      fireEvent.click(button);
      fireEvent.click(button);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('the Account panel closes when Tab moves focus out of the header', async () => {
      renderHeader('/', { user: aUser() });
      fireEvent.click(await screen.findByRole('button', { name: 'Account' }));
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();

      fireEvent.focusIn(document.body);

      expect(screen.queryByText('anna@example.com')).not.toBeInTheDocument();
    });

    it('the Account panel closes on Escape (focus goes back), and on a click outside', async () => {
      renderHeader('/', { user: aUser() });
      const button = await screen.findByRole('button', { name: 'Account' });

      fireEvent.click(button);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText('anna@example.com')).not.toBeInTheDocument();
      expect(button).toHaveFocus();

      fireEvent.click(button);
      fireEvent.pointerDown(document.body);
      expect(screen.queryByText('anna@example.com')).not.toBeInTheDocument();
    });

    it('only one panel is open at a time: account, search and menu', async () => {
      renderHeader('/', { user: aUser() });
      await screen.findByRole('button', { name: 'Account' });

      fireEvent.click(screen.getByRole('button', { name: 'Account' }));
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      expect(screen.queryByText('anna@example.com')).not.toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Account' }));
      expect(screen.getByText('anna@example.com')).toBeInTheDocument();
      expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(1);
    });
  });
});
