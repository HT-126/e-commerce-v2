import { ApiError } from '../../lib/api.js';

// Turns what went wrong into messages for the form: `form` for the whole form, `fields` for single fields.
export function describeAuthError(error) {
  if (!(error instanceof ApiError)) {
    return { form: 'Could not reach the server. Check your connection and try again.', fields: {} };
  }

  if (error.code === 'INVALID_CREDENTIALS') return { form: 'Wrong email or password.', fields: {} };
  if (error.code === 'EMAIL_TAKEN') {
    return { form: null, fields: { email: 'An account with this email already exists.' } };
  }
  if (error.status === 429) return { form: 'Too many attempts. Try again later.', fields: {} };

  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    const fields = {};
    for (const issue of error.details) {
      const field = issue.path?.[0];
      if (field && !fields[field]) fields[field] = issue.message;
    }
    return Object.keys(fields).length > 0
      ? { form: null, fields }
      : { form: 'Please check the form and try again.', fields: {} };
  }

  return { form: 'Something went wrong. Please try again.', fields: {} };
}
