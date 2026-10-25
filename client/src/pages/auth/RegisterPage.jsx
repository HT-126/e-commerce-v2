import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router';
import Button from '../../components/Button.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';
import TextField from '../../components/TextField.jsx';
import { useMe, useRegister } from '../../hooks/use-auth.js';
import { safeInternalPath } from '../../lib/safe-path.js';
import AuthShell from './AuthShell.jsx';
import { describeAuthError } from './auth-errors.js';
import { registerFormSchema } from './register-schema.js';

const PANEL = {
  title: 'Your pieces,',
  accent: 'your orders.',
  points: [
    'Check out faster with your account',
    'Track your orders in one place',
    'Review the pieces you bought',
  ],
};

// A larger form: React Hook Form with the Zod schema, and the errors shown under each field.
export default function RegisterPage() {
  const location = useLocation();
  const { data: user, isPending } = useMe();
  const registerUser = useRegister();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', acceptTerms: false },
  });

  const backTo = safeInternalPath(location.state?.from);
  if (user) return <Navigate to={backTo} replace />;

  async function submit(values) {
    setFormError(null);
    try {
      await registerUser.mutateAsync(values);
    } catch (error) {
      const { form, fields } = describeAuthError(error);
      setFormError(form);
      for (const [field, message] of Object.entries(fields)) setError(field, { message });
    }
  }

  return (
    <AuthShell panel={PANEL} heading="Create" accent="account" intro="It takes less than a minute.">
      {isPending ? (
        <p className="text-ink-soft">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="First name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <TextField
              label="Last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={errors.password?.message}
            {...register('password')}
          />

          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                aria-invalid={errors.acceptTerms ? true : undefined}
                className="mt-0.5 size-5 shrink-0 accent-primary"
                {...register('acceptTerms')}
              />
              {/* Plain text for now: there are no Terms or Privacy pages yet, so no links to nowhere. */}
              <span>I agree to the Terms and Privacy Policy.</span>
            </label>
            {errors.acceptTerms && (
              <p role="alert" className="px-8 pt-1 text-sm text-error">
                {errors.acceptTerms.message}
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="rounded-2xl bg-white px-5 py-3 text-sm text-error">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full min-h-[54px] text-base" disabled={registerUser.isPending}>
            {registerUser.isPending ? 'Creating account...' : 'Create account'}
          </Button>

          <p className="text-center text-sm text-ink-soft">
            Already have an account?{' '}
            <Link
              to="/login"
              state={location.state}
              className="font-medium text-ink underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
