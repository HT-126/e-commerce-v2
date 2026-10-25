import { describe, expect, it } from 'vitest';
import { envProblems } from '../../src/config/env.js';

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
