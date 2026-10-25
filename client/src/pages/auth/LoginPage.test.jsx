import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, bodiesSentTo, renderRoute, stubApi } from '../../test-utils.jsx';
import LoginPage from './LoginPage.jsx';

afterEach(() => vi.unstubAllGlobals());

// Where the visitor ended up, and the state the link carried.
function Where() {
  const { pathname, search, state } = useLocation();
  return <p data-testid="where">{pathname + search + (state ? ` ${JSON.stringify(state)}` : '')}</p>;
}

const guest = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };
const where = () => screen.getByTestId('where').textContent;

// `login`: what the sign-in request answers. `me`: who is signed in at the start.
function renderLogin({ login = { body: { data: { user: aUser() } } }, me = guest, from } = {}) {
  const fetchMock = stubApi((url) => {
    if (url === '/api/auth/me') return me;
    if (url === '/api/auth/login') return login;
    return { body: { data: { items: [], page: 1, limit: 8, total: 0 } } };
  });
  renderRoute(<LoginPage />, {
    path: '/login',
    url: { pathname: '/login', state: from ? { from } : null },
    extraRoutes: <Route path="*" element={<Where />} />,
  });
  return fetchMock;
}

const fill = async (email, password) => {
  fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

describe('LoginPage', () => {
  it('shows the sign in form as designed', async () => {
    renderLogin();

    expect(await screen.findByLabelText('Email address')).toBeRequired();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toBeRequired();
    expect(screen.getByRole('checkbox', { name: 'Keep me signed in' })).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
  });

  it('promises only what exists: no wishlist, no "Forgot password?" link', async () => {
    renderLogin();
    await screen.findByLabelText('Email address');

    expect(screen.queryByText(/wishlist|saved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
  });

  it('signs in and goes to Home, trimming the email', async () => {
    const fetchMock = renderLogin();

    await fill('  anna@example.com ', 'password123');
    submit();

    await waitFor(() => expect(where()).toBe('/'));
    expect(bodiesSentTo(fetchMock, '/api/auth/login')).toEqual([
      { email: 'anna@example.com', password: 'password123', remember: false },
    ]);
  });

  it('sends "remember" when "Keep me signed in" is ticked', async () => {
    const fetchMock = renderLogin();

    await fill('anna@example.com', 'password123');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Keep me signed in' }));
    submit();

    await waitFor(() => expect(bodiesSentTo(fetchMock, '/api/auth/login')[0].remember).toBe(true));
  });

  it('goes back to the page the visitor came from', async () => {
    renderLogin({ from: '/shop?q=dress' });

    await fill('anna@example.com', 'password123');
    submit();

    await waitFor(() => expect(where()).toBe('/shop?q=dress'));
  });

  it('never goes to another site, even if the page was opened with one', async () => {
    renderLogin({ from: '//evil.example' });

    await fill('anna@example.com', 'password123');
    submit();

    await waitFor(() => expect(where()).toBe('/'));
  });

  it('shows "Wrong email or password." and stays, keeping what was typed', async () => {
    renderLogin({
      login: {
        status: 401,
        body: { error: { message: 'Wrong email or password', code: 'INVALID_CREDENTIALS' } },
      },
    });

    await fill('anna@example.com', 'wrong-password');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
    expect(screen.getByLabelText('Email address')).toHaveValue('anna@example.com');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows the too-many-attempts message', async () => {
    renderLogin({
      login: { status: 429, body: { error: { message: 'Too many attempts', code: 'RATE_LIMITED' } } },
    });

    await fill('anna@example.com', 'password123');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Try again later.');
  });

  it('shows what the server says is wrong with the input', async () => {
    renderLogin({
      login: {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: [{ path: ['password'], message: 'At most 72 bytes' }],
          },
        },
      },
    });

    await fill('anna@example.com', 'x'.repeat(80));
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('At most 72 bytes');
  });

  it('says so when the server cannot be reached', async () => {
    renderLogin();
    const real = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) =>
        url === '/api/auth/login' ? Promise.reject(new TypeError('Failed to fetch')) : real(url, init),
      ),
    );

    await fill('anna@example.com', 'password123');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the server/);
  });

  it('disables the button while signing in, so a double click sends one request', async () => {
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    renderLogin();
    const real = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url, init) => {
        if (url === '/api/auth/login') {
          await gate;
          return Response.json({ data: { user: aUser() } });
        }
        return real(url, init);
      }),
    );

    await fill('anna@example.com', 'password123');
    submit();

    const button = await screen.findByRole('button', { name: 'Signing in...' });
    expect(button).toBeDisabled();
    release();
    await waitFor(() => expect(where()).toBe('/'));
  });

  it('sends a signed-in visitor away from the sign in page', async () => {
    renderLogin({ me: { body: { data: { user: aUser() } } }, from: '/shop' });

    await waitFor(() => expect(where()).toBe('/shop'));
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
  });

  it('the link to the register page keeps where the visitor came from', async () => {
    renderLogin({ from: '/shop?q=dress' });

    fireEvent.click(await screen.findByRole('link', { name: 'Create an account' }));

    await waitFor(() => expect(where()).toBe('/register {"from":"/shop?q=dress"}'));
  });
});
