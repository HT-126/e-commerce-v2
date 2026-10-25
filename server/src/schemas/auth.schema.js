import { z } from 'zod';

// bcrypt reads only the first 72 bytes. A longer password is rejected (not cut), and this also stops
// "the real password plus anything" from signing in.
const MAX_PASSWORD_BYTES = 72;
const fitsBcrypt = (password) => Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_BYTES;

const name = z.string().trim().min(1, 'Required').max(60, 'At most 60 characters');
const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email').max(255));

export const registerUserSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .refine(fitsBcrypt, `At most ${MAX_PASSWORD_BYTES} bytes`),
  acceptTerms: z.literal(true, { error: 'Please accept the terms' }),
});

export const loginUserSchema = z.object({
  email,
  password: z.string().min(1, 'Required').refine(fitsBcrypt, `At most ${MAX_PASSWORD_BYTES} bytes`),
  remember: z.boolean().default(false),
});
