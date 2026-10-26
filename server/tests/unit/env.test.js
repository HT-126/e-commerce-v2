import { describe, expect, it } from 'vitest';
import { cookieSecure, envProblems } from '../../src/config/env.js';

const strong = 'x'.repeat(32);

describe('envProblems', () => {
  it('finds nothing wrong with good values', () => {
    expect(envProblems({ NODE_ENV: 'development', JWT_SECRET: 'short', TRUST_PROXY: undefined })).toEqual([]);
    expect(envProblems({ NODE_ENV: 'production', JWT_SECRET: strong, TRUST_PROXY: '1' })).toEqual([]);
  });

  it.each(['true', 'one', '1.5', '-1', ' 1', '1 '])(
    'rejects TRUST_PROXY=%s (it must be a whole number)',
    (value) => {
      expect(envProblems({ TRUST_PROXY: value })).toHaveLength(1);
    },
  );

  it('allows TRUST_PROXY to be unset or 0', () => {
    expect(envProblems({})).toEqual([]);
    expect(envProblems({ TRUST_PROXY: '0' })).toEqual([]);
  });

  it('wants a long JWT_SECRET in production, but not while developing or testing', () => {
    expect(envProblems({ NODE_ENV: 'production', JWT_SECRET: 'short' })).toHaveLength(1);
    expect(envProblems({ NODE_ENV: 'production' })).toHaveLength(1);
    expect(envProblems({ NODE_ENV: 'test', JWT_SECRET: 'ci-only-secret' })).toEqual([]);
  });
});

describe('COOKIE_SECURE', () => {
  it.each(['true', 'false'])('accepts COOKIE_SECURE=%s', (value) => {
    expect(envProblems({ COOKIE_SECURE: value })).toEqual([]);
  });

  it.each(['yes', '1', 'TRUE', 'no', ' true'])('rejects COOKIE_SECURE=%s (it must be true or false)', (value) => {
    expect(envProblems({ COOKIE_SECURE: value })).toEqual(['COOKIE_SECURE must be true or false']);
  });

  it('may be left unset', () => {
    expect(envProblems({ NODE_ENV: 'production', JWT_SECRET: strong })).toEqual([]);
  });
});

describe('cookieSecure', () => {
  it('is on in production and off everywhere else, when COOKIE_SECURE is not set', () => {
    expect(cookieSecure({ NODE_ENV: 'production' })).toBe(true);
    expect(cookieSecure({ NODE_ENV: 'development' })).toBe(false);
    expect(cookieSecure({ NODE_ENV: 'test' })).toBe(false);
    expect(cookieSecure({})).toBe(false);
  });

  it('follows COOKIE_SECURE when it is set, in production too (the local Docker run is plain http)', () => {
    expect(cookieSecure({ NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toBe(false);
    expect(cookieSecure({ NODE_ENV: 'development', COOKIE_SECURE: 'true' })).toBe(true);
    expect(cookieSecure({ NODE_ENV: 'production', COOKIE_SECURE: 'true' })).toBe(true);
  });
});
