import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, bodiesSentTo, renderRoute, stubApi } from '../../test-utils.jsx';
import RegisterPage from './RegisterPage.jsx';

afterEach(() => vi.unstubAllGlobals());

function Where() {
  const { pathname, search, state } = useLocation();
  return <p data-testid="where">{pathname + search + (state ? ` ${JSON.stringify(state)}` : '')}</p>;
}

const guest = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };
const where = () => screen.getByTestId('where').textContent;

function renderRegister({ register = { status: 201, body: { data: { user: aUser() } } }, from } = {}) {
  const fetchMock = stubApi((url) => {
    if (url === '/api/auth/me') return guest;
    if (url === '/api/auth/register') return register;
    return { body: { data: { items: [], page: 1, limit: 8, total: 0 } } };
  });
  renderRoute(<RegisterPage />, {
    path: '/register',
    url: { pathname: '/register', state: from ? { from } : null },
    extraRoutes: <Route path="*" element={<Where />} />,
  });
  return fetchMock;
}

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function fillValid(overrides = {}) {
  await screen.findByLabelText('First name');
  const values = {
    'First name': ' Anna ',
    'Last name': 'Kim',
    'Email address': ' anna@example.com ',
    Password: 'password123',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) type(label, value);
  fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms/ }));
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

describe('RegisterPage', () => {
  it('shows the form as designed, with the password hint', async () => {
    renderRegister();

    expect(await screen.findByLabelText('First name')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Create account' })).toBeInTheDocument();
    for (const label of ['First name', 'Last name', 'Email address', 'Password']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('promises only what exists: no wishlist or returns, and Terms and Privacy are plain text, not links', async () => {
    renderRegister();
    await screen.findByLabelText('First name');

    expect(screen.queryByText(/wishlist|saved|return/i)).not.toBeInTheDocument();
    expect(screen.getByText('I agree to the Terms and Privacy Policy.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /terms|privacy/i })).not.toBeInTheDocument();
  });

  it('asks for every empty field under the field, and sends nothing', async () => {
    const fetchMock = renderRegister();
    await screen.findByLabelText('First name');

    submit();

    expect(await screen.findAllByText('Required')).toHaveLength(3);
    expect(screen.getByText('At least 8 characters', { selector: '[role=alert]' })).toBeInTheDocument();
    expect(screen.getByText('Please accept the terms')).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, '/api/auth/register')).toEqual([]);
  });

  it('links the terms error to the checkbox, so a screen reader hears it', async () => {
    renderRegister();
    await screen.findByLabelText('First name');

    submit();

    const checkbox = await screen.findByRole('checkbox', { name: /I agree to the Terms/ });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAccessibleDescription('Please accept the terms');
  });

  it.each([
    ['an invalid email', { 'Email address': 'anna@' }, 'Enter a valid email'],
    ['a password that is too short', { Password: '1234567' }, 'At least 8 characters'],
    ['a password over 72 bytes', { Password: 'a'.repeat(73) }, 'At most 72 bytes'],
    ['a name over 60 characters', { 'First name': 'a'.repeat(61) }, 'At most 60 characters'],
  ])('shows an error for %s, and sends nothing', async (_name, overrides, message) => {
    const fetchMock = renderRegister();
    await fillValid(overrides);

    submit();

    expect(await screen.findByText(message, { selector: '[role=alert]' })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, '/api/auth/register')).toEqual([]);
  });

  it('registers with the trimmed values and goes to Home', async () => {
    const fetchMock = renderRegister();
    await fillValid();

    submit();

    await waitFor(() => expect(where()).toBe('/'));
    expect(bodiesSentTo(fetchMock, '/api/auth/register')).toEqual([
      {
        firstName: 'Anna',
        lastName: 'Kim',
        email: 'anna@example.com',
        password: 'password123',
        acceptTerms: true,
      },
    ]);
  });

  it('goes back to the page the visitor came from', async () => {
    renderRegister({ from: '/products/blue-dress' });
    await fillValid();

    submit();

    await waitFor(() => expect(where()).toBe('/products/blue-dress'));
  });

  it('shows "email taken" under the email field, and stays', async () => {
    renderRegister({
      register: {
        status: 409,
        body: { error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists' } },
      },
    });
    await fillValid();

    submit();

    const error = await screen.findByText('An account with this email already exists.');
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(error.textContent);
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    // what was typed stays as typed (only the copy that is sent is trimmed)
    expect(screen.getByLabelText('First name')).toHaveValue(' Anna ');
  });

  it("shows the server's field errors under their fields", async () => {
    renderRegister({
      register: {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: [{ path: ['lastName'], message: 'At most 60 characters' }],
          },
        },
      },
    });
    await fillValid();

    submit();

    expect(await screen.findByLabelText('Last name')).toHaveAccessibleDescription('At most 60 characters');
  });

  it('shows the too-many-attempts message for the whole form', async () => {
    renderRegister({
      register: { status: 429, body: { error: { code: 'RATE_LIMITED', message: 'Too many attempts' } } },
    });
    await fillValid();

    submit();

    expect(await screen.findByText('Too many attempts. Try again later.')).toBeInTheDocument();
  });

  it('the Show button reveals the password', async () => {
    renderRegister();
    await screen.findByLabelText('First name');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('the link to sign in keeps where the visitor came from', async () => {
    renderRegister({ from: '/shop' });

    fireEvent.click(await screen.findByRole('link', { name: 'Sign in' }));

    await waitFor(() => expect(where()).toBe('/login {"from":"/shop"}'));
  });
});
