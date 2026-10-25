import { describe, expect, it } from 'vitest';
import { registerFormSchema } from './register-schema.js';

const valid = {
  firstName: 'Anna',
  lastName: 'Kim',
  email: 'anna@example.com',
  password: 'password123',
  acceptTerms: true,
};

const messages = (input) => {
  const result = registerFormSchema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('registerFormSchema', () => {
  it('accepts a valid form, trimming the names and the email', () => {
    const parsed = registerFormSchema.parse({ ...valid, firstName: ' Anna ', email: ' anna@example.com ' });

    expect(parsed).toMatchObject({ firstName: 'Anna', email: 'anna@example.com' });
  });

  it('asks for every empty field', () => {
    expect(messages({ firstName: '', lastName: ' ', email: '', password: '', acceptTerms: false })).toEqual({
      firstName: 'Required',
      lastName: 'Required',
      email: 'Required',
      password: 'At least 8 characters',
      acceptTerms: 'Please accept the terms',
    });
  });

  it.each([
    ['an invalid email', { email: 'anna@' }, { email: 'Enter a valid email' }],
    ['a password of 7 characters', { password: '1234567' }, { password: 'At least 8 characters' }],
    ['a password of 73 bytes', { password: 'a'.repeat(73) }, { password: 'At most 72 bytes' }],
    ['a password of 37 two-byte letters', { password: 'é'.repeat(37) }, { password: 'At most 72 bytes' }],
    ['a name over 60 characters', { firstName: 'a'.repeat(61) }, { firstName: 'At most 60 characters' }],
    ['terms not accepted', { acceptTerms: false }, { acceptTerms: 'Please accept the terms' }],
  ])('rejects %s', (_name, change, expected) => {
    expect(messages({ ...valid, ...change })).toEqual(expected);
  });

  it('accepts a password of exactly 72 bytes', () => {
    expect(messages({ ...valid, password: 'a'.repeat(72) })).toEqual({});
  });
});
