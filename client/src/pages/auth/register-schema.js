import { z } from 'zod';

// The check in the browser is only for the user's comfort. The server checks everything again.
const MAX_PASSWORD_BYTES = 72;
const name = z.string().trim().min(1, 'Required').max(60, 'At most 60 characters');

export const registerFormSchema = z.object({
  firstName: name,
  lastName: name,
  email: z.string().trim().min(1, 'Required').pipe(z.email('Enter a valid email').max(255)),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .refine(
      (password) => new TextEncoder().encode(password).length <= MAX_PASSWORD_BYTES,
      'At most 72 bytes',
    ),
  acceptTerms: z.literal(true, { error: 'Please accept the terms' }),
});
