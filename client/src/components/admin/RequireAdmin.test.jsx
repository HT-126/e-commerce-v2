import { fireEvent, screen } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aUser, renderRoute, stubApi } from '../../test-utils.jsx';
import RequireAdmin from './RequireAdmin.jsx';

afterEach(() => vi.unstubAllGlobals());

const signedOut = { status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } };

function Landing({ name }) {
  const { state } = useLocation();
  return (
    <p data-testid={name}>
      {name} {state?.from}
    </p>
  );
}

function renderGuarded(me, url = '/admin/orders?status=paid') {
  stubApi(() => me);
  renderRoute(
    <RequireAdmin>
      <p>admin page</p>
    </RequireAdmin>,
    {
      path: '/admin/*',
      url,
      extraRoutes: [
        <Route key="login" path="/login" element={<Landing name="login" />} />,
        <Route key="home" path="/" element={<Landing name="home" />} />,
      ],
    },
  );
}

describe('RequireAdmin', () => {
  it('shows a loading state while it finds out who is signed in', () => {
    renderGuarded({ body: { data: { user: aUser({ role: 'admin' }) } } });

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryByText('admin page')).not.toBeInTheDocument();
  });

  it('shows the page to an admin', async () => {
    renderGuarded({ body: { data: { user: aUser({ role: 'admin' }) } } });

    expect(await screen.findByText('admin page')).toBeInTheDocument();
  });

  it('sends a guest to sign in, and remembers the page to come back to', async () => {
    renderGuarded(signedOut);

    expect(await screen.findByTestId('login')).toHaveTextContent('/admin/orders?status=paid');
    expect(screen.queryByText('admin page')).not.toBeInTheDocument();
  });

  it('sends a customer Home, and never shows the page', async () => {
    renderGuarded({ body: { data: { user: aUser({ role: 'customer' }) } } });

    expect(await screen.findByTestId('home')).toBeInTheDocument();
    expect(screen.queryByText('admin page')).not.toBeInTheDocument();
  });

  it('does not send anyone away when the check itself fails, and lets them try again', async () => {
    let answer = { status: 500, body: { error: { message: 'Something went wrong' } } };
    stubApi(() => answer);
    renderRoute(
      <RequireAdmin>
        <p>admin page</p>
      </RequireAdmin>,
      {
        path: '/admin/*',
        url: '/admin/products',
        extraRoutes: <Route path="/login" element={<Landing name="login" />} />,
      },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check that you are signed in.');
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
    answer = { body: { data: { user: aUser({ role: 'admin' }) } } };
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('admin page')).toBeInTheDocument();
  });
});
