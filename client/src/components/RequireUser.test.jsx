import { screen } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, renderRoute, stubApi } from '../test-utils.jsx';
import RequireUser from './RequireUser.jsx';

afterEach(() => vi.unstubAllGlobals());

const signedOut = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };

function SignInPage() {
  const { state } = useLocation();
  return <p data-testid="sign-in">sign in, back to {state?.from}</p>;
}

function renderGuarded(me) {
  stubApi(() => me);
  renderRoute(
    <RequireUser>
      <p>secret page</p>
    </RequireUser>,
    {
      path: '/account/orders',
      url: '/account/orders?page=2',
      extraRoutes: <Route path="/login" element={<SignInPage />} />,
    },
  );
}

describe('RequireUser', () => {
  it('shows a loading state while it finds out who is signed in', () => {
    renderGuarded({ body: { data: { user: aUser() } } });

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('shows the page to a signed-in user', async () => {
    renderGuarded({ body: { data: { user: aUser() } } });

    expect(await screen.findByText('secret page')).toBeInTheDocument();
  });

  it('sends a guest to sign in, and remembers the page to come back to', async () => {
    renderGuarded(signedOut);

    expect(await screen.findByTestId('sign-in')).toHaveTextContent('back to /account/orders?page=2');
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });
});
