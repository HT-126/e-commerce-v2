import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { cookieOptions, sessionSeconds, signToken, verifyToken } from '../../src/utils/session.js';

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('sessionSeconds', () => {
  it('is 30 days with "Keep me signed in" and 1 day without', () => {
    expect(sessionSeconds(true)).toBe(30 * 24 * 60 * 60);
    expect(sessionSeconds(false)).toBe(24 * 60 * 60);
  });
});

describe('signToken and verifyToken', () => {
  it('gives back the user id', () => {
    expect(verifyToken(signToken(42, false))).toBe(42);
    expect(verifyToken(signToken(7, true))).toBe(7);
  });

  it('expires with the session: 1 day, or 30 days with remember', () => {
    const lifetime = (token) => {
      const { iat, exp } = jwt.decode(token);
      return exp - iat;
    };

    expect(lifetime(signToken(1, false))).toBe(sessionSeconds(false));
    expect(lifetime(signToken(1, true))).toBe(sessionSeconds(true));
  });

  it('holds only the user id: no role, no email', () => {
    const payload = jwt.decode(signToken(5, false));

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
  });

  it.each([
    ['a missing token', undefined],
    ['an empty token', ''],
    ['garbage', 'not-a-token'],
    ['a token with a wrong signature', signToken(1, false).slice(0, -3) + 'abc'],
    ['a token signed with another secret', jwt.sign({ sub: '1' }, 'another-secret', { expiresIn: 60 })],
    ['an expired token', jwt.sign({ sub: '1' }, env.JWT_SECRET, { expiresIn: -10 })],
    [
      'a token with no signature (alg none)',
      `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: '1' })}.`,
    ],
    ['a token whose user id is not a number', jwt.sign({ sub: 'abc' }, env.JWT_SECRET, { expiresIn: 60 })],
    ['a token without a user id', jwt.sign({}, env.JWT_SECRET, { expiresIn: 60 })],
    ['a token signed with another algorithm', jwt.sign({ sub: '1' }, env.JWT_SECRET, { algorithm: 'HS512' })],
  ])('rejects %s', (_name, token) => {
    expect(verifyToken(token)).toBeNull();
  });
});

describe('cookieOptions', () => {
  it('is HttpOnly, SameSite=Lax and for the whole site', () => {
    expect(cookieOptions(false)).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
    expect(cookieOptions(true)).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });

  it('is Secure (HTTPS only) in production, and not outside it', () => {
    expect(cookieOptions(true).secure).toBe(true);
    expect(cookieOptions(false).secure).toBe(false);
  });

  it('follows NODE_ENV when no flag is given (tests run outside production)', () => {
    expect(cookieOptions().secure).toBe(false);
  });
});
