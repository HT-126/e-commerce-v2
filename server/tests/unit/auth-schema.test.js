import { describe, expect, it } from 'vitest';
import { loginUserSchema, registerUserSchema } from '../../src/schemas/auth.schema.js';

const valid = {
  firstName: 'Anna',
  lastName: 'Kim',
  email: 'anna@example.com',
  password: 'password123',
  acceptTerms: true,
};

const problems = (schema, input) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('registerUserSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerUserSchema.parse(valid)).toEqual(valid);
  });

  it('trims the names, and trims and lower-cases the email', () => {
    const parsed = registerUserSchema.parse({
      ...valid,
      firstName: '  Anna ',
      lastName: ' Kim  ',
      email: '  Anna@Example.COM ',
    });

    expect(parsed).toMatchObject({ firstName: 'Anna', lastName: 'Kim', email: 'anna@example.com' });
  });

  it('keeps the password as typed (spaces are allowed)', () => {
    expect(registerUserSchema.parse({ ...valid, password: '  spaces are fine  ' }).password).toBe(
      '  spaces are fine  ',
    );
  });

  it.each([
    ['an empty first name', { firstName: '' }, 'firstName'],
    ['a blank last name', { lastName: '   ' }, 'lastName'],
    ['a name over 60 characters', { firstName: 'a'.repeat(61) }, 'firstName'],
    ['an invalid email', { email: 'anna@' }, 'email'],
    ['an email over 255 characters', { email: `${'a'.repeat(250)}@example.com` }, 'email'],
    ['a password of 7 characters', { password: '1234567' }, 'password'],
    ['terms not accepted', { acceptTerms: false }, 'acceptTerms'],
    ['terms as text', { acceptTerms: 'true' }, 'acceptTerms'],
  ])('rejects %s', (_name, change, field) => {
    expect(problems(registerUserSchema, { ...valid, ...change })).toEqual([field]);
  });

  it('rejects missing fields', () => {
    expect(problems(registerUserSchema, {}).sort()).toEqual(
      ['acceptTerms', 'email', 'firstName', 'lastName', 'password'].sort(),
    );
  });

  describe('password length in bytes (bcrypt reads only the first 72)', () => {
    it('accepts 8 and 72 bytes', () => {
      expect(problems(registerUserSchema, { ...valid, password: 'a'.repeat(8) })).toEqual([]);
      expect(problems(registerUserSchema, { ...valid, password: 'a'.repeat(72) })).toEqual([]);
    });

    it('rejects 73 bytes', () => {
      expect(problems(registerUserSchema, { ...valid, password: 'a'.repeat(73) })).toEqual(['password']);
    });

    it('counts bytes, not characters: 37 two-byte letters are 74 bytes', () => {
      expect(problems(registerUserSchema, { ...valid, password: 'é'.repeat(37) })).toEqual(['password']);
      expect(problems(registerUserSchema, { ...valid, password: 'é'.repeat(36) })).toEqual([]);
    });
  });
});

describe('loginUserSchema', () => {
  it('accepts email and password, and remember defaults to false', () => {
    expect(loginUserSchema.parse({ email: 'Anna@Example.com ', password: 'x' })).toEqual({
      email: 'anna@example.com',
      password: 'x',
      remember: false,
    });
  });

  it('accepts remember: true', () => {
    expect(loginUserSchema.parse({ email: 'a@b.co', password: 'x', remember: true }).remember).toBe(true);
  });

  it.each([
    ['an empty password', { password: '' }, 'password'],
    ['a password over 72 bytes (it would match a shorter one)', { password: 'a'.repeat(73) }, 'password'],
    ['an invalid email', { email: 'nope' }, 'email'],
    ['remember as text', { remember: 'yes' }, 'remember'],
  ])('rejects %s', (_name, change, field) => {
    expect(problems(loginUserSchema, { email: 'a@b.co', password: 'x', ...change })).toEqual([field]);
  });
});
