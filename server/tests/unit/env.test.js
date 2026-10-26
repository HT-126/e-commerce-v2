import { describe, expect, it } from 'vitest';
import { cookieSecure, dbSsl, envProblems, requiredVars } from '../../src/config/env.js';

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

describe('requiredVars', () => {
  it('asks for the test database while developing and testing', () => {
    expect(requiredVars('development')).toContain('DB_NAME_TEST');
    expect(requiredVars('test')).toContain('DB_NAME_TEST');
    expect(requiredVars(undefined)).toContain('DB_NAME_TEST');
  });

  it('does not ask for it in production, where a host has no test database', () => {
    expect(requiredVars('production')).not.toContain('DB_NAME_TEST');
  });

  it('asks for everything else in every mode', () => {
    for (const mode of ['development', 'test', 'production']) {
      expect(requiredVars(mode)).toEqual(
        expect.arrayContaining(['PORT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET']),
      );
    }
  });
});

describe('DB_SSL', () => {
  it.each(['true', 'false'])('accepts DB_SSL=%s', (value) => {
    expect(envProblems({ DB_SSL: value })).toEqual([]);
  });

  it.each(['yes', '1', 'TRUE', ' true'])('rejects DB_SSL=%s (it must be true or false)', (value) => {
    expect(envProblems({ DB_SSL: value })).toEqual(['DB_SSL must be true or false']);
  });

  it('may be left unset', () => {
    expect(envProblems({})).toEqual([]);
  });

  it('accepts a certificate with DB_SSL=true', () => {
    expect(envProblems({ DB_SSL: 'true', DB_SSL_CA: '-----BEGIN CERTIFICATE-----' })).toEqual([]);
  });

  it.each([{}, { DB_SSL: 'false' }])('refuses a certificate when DB_SSL is not true (%j)', (vars) => {
    expect(envProblems({ ...vars, DB_SSL_CA: '-----BEGIN CERTIFICATE-----' })).toEqual([
      'DB_SSL_CA is only used when DB_SSL is true',
    ]);
  });
});

describe('dbSsl', () => {
  it('is off (a plain connection) unless DB_SSL is true', () => {
    expect(dbSsl({})).toBeUndefined();
    expect(dbSsl({ DB_SSL: 'false' })).toBeUndefined();
    expect(dbSsl({ DB_SSL: 'false', DB_SSL_CA: 'x' })).toBeUndefined();
  });

  it('encrypts and checks the server certificate when DB_SSL is true', () => {
    expect(dbSsl({ DB_SSL: 'true' })).toEqual({ rejectUnauthorized: true });
  });

  it('adds the certificate of the authority when there is one', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----\n';

    expect(dbSsl({ DB_SSL: 'true', DB_SSL_CA: pem })).toEqual({ rejectUnauthorized: true, ca: pem });
  });

  it('turns \\n written as text into line breaks, for a form that flattened them', () => {
    const flat = '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----';

    expect(dbSsl({ DB_SSL: 'true', DB_SSL_CA: flat }).ca).toBe(
      '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----',
    );
  });

  it('never turns the check off: there is no way to ask for an unchecked connection', () => {
    for (const vars of [{ DB_SSL: 'true' }, { DB_SSL: 'true', DB_SSL_CA: 'x' }]) {
      expect(dbSsl(vars).rejectUnauthorized).toBe(true);
    }
  });
});
