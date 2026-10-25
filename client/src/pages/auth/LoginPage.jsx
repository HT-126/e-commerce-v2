import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import Button from '../../components/Button.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';
import TextField from '../../components/TextField.jsx';
import { useLogin, useMe } from '../../hooks/use-auth.js';
import { safeInternalPath } from '../../lib/safe-path.js';
import AuthShell from './AuthShell.jsx';
import { describeAuthError } from './auth-errors.js';

const PANEL = {
  title: 'Pick up',
  accent: 'where you left off.',
  text: 'Track your orders and check out faster.',
};

// A simple form, so the browser checks it (required, type="email"). The server checks everything again.
export default function LoginPage() {
  const location = useLocation();
  const { data: user, isPending } = useMe();
  const login = useLogin();
  const [formError, setFormError] = useState(null);
  const [emailError, setEmailError] = useState(null);

  // Back to the page the visitor came from (the header link sets it), else Home.
  const backTo = safeInternalPath(location.state?.from);

  // A signed-in visitor has no business here. This also sends a visitor on right after signing in.
  if (user) return <Navigate to={backTo} replace />;

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFormError(null);
    setEmailError(null);

    try {
      await login.mutateAsync({
        email: data.get('email').trim(),
        password: data.get('password'),
        remember: data.get('remember') === 'on',
      });
    } catch (error) {
      const { form, fields } = describeAuthError(error);
      setFormError(form);
      setEmailError(fields.email ?? null);
      if (!form && !fields.email && Object.keys(fields).length > 0) setFormError(Object.values(fields)[0]);
    }
  }

  return (
    <AuthShell panel={PANEL} heading="Sign" accent="in" intro="Welcome back. Enter your details below.">
      {isPending ? (
        <p className="text-ink-soft">Loading...</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <TextField
            label="Email address"
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            placeholder="you@example.com"
            error={emailError}
          />
          <PasswordInput label="Password" name="password" required autoComplete="current-password" />

          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" name="remember" className="size-5 accent-primary" />
            Keep me signed in
          </label>

          {formError && (
            <p role="alert" className="rounded-2xl bg-white px-5 py-3 text-sm text-error">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full min-h-[54px] text-base" disabled={login.isPending}>
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-sm text-ink-soft">
            New to Lumière?{' '}
            <Link
              to="/register"
              state={location.state}
              className="font-medium text-ink underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
