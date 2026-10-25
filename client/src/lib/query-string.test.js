import { describe, expect, it } from 'vitest';
import { buildQuery } from './query-string.js';

describe('buildQuery', () => {
  it('writes the values after a question mark', () => {
    expect(buildQuery({ page: 2, status: 'paid' })).toBe('?page=2&status=paid');
  });

  it('leaves out empty, null and undefined values', () => {
    expect(buildQuery({ q: '', status: undefined, sort: null, page: 1 })).toBe('?page=1');
  });

  it('keeps 0 and false', () => {
    expect(buildQuery({ page: 0, active: false })).toBe('?page=0&active=false');
  });

  it('writes nothing for no values', () => {
    expect(buildQuery({})).toBe('');
    expect(buildQuery()).toBe('');
  });

  it('escapes special characters', () => {
    expect(buildQuery({ q: 'a&b c' })).toBe('?q=a%26b+c');
  });
});
