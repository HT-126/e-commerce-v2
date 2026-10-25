import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api.js';
import { describeAuthError } from './auth-errors.js';

describe('describeAuthError', () => {
  it('wrong credentials: one message for the whole form', () => {
    const error = new ApiError(401, 'INVALID_CREDENTIALS', 'Wrong email or password');

    expect(describeAuthError(error)).toEqual({ form: 'Wrong email or password.', fields: {} });
  });

  it('email taken: a message under the email field', () => {
    const error = new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');

    expect(describeAuthError(error)).toEqual({
      form: null,
      fields: { email: 'An account with this email already exists.' },
    });
  });

  it('too many attempts: a message for the whole form', () => {
    const error = new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.');

    expect(describeAuthError(error)).toEqual({ form: 'Too many attempts. Try again later.', fields: {} });
  });

  it('validation errors: one message per field, the first message wins', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', [
      { path: ['email'], message: 'Enter a valid email' },
      { path: ['email'], message: 'Something else' },
      { path: ['password'], message: 'At least 8 characters' },
    ]);

    expect(describeAuthError(error)).toEqual({
      form: null,
      fields: { email: 'Enter a valid email', password: 'At least 8 characters' },
    });
  });

  it('validation errors without a field: a message for the whole form', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid input', [{ path: [], message: 'x' }]);

    expect(describeAuthError(error).form).toBe('Please check the form and try again.');
  });

  it('anything else from the server: a general message', () => {
    expect(describeAuthError(new ApiError(500, undefined, 'Something went wrong')).form).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('no answer at all (the network failed): says so', () => {
    expect(describeAuthError(new TypeError('Failed to fetch')).form).toMatch(/Could not reach the server/);
  });
});
