import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safe-path.js';

describe('safeInternalPath', () => {
  it.each([
    ['/shop', '/shop'],
    ['/shop?q=dress&page=2', '/shop?q=dress&page=2'],
    ['/products/blue-dress', '/products/blue-dress'],
    ['/', '/'],
  ])('keeps the path inside this site: %s', (input, expected) => {
    expect(safeInternalPath(input)).toBe(expected);
  });

  it.each([
    ['another site', 'https://evil.example/login'],
    ['a protocol-relative address', '//evil.example'],
    ['a path without a slash', 'shop'],
    ['nothing', undefined],
    ['null', null],
    ['an object', { from: '/shop' }],
    ['an empty string', ''],
  ])('falls back to Home for %s', (_name, input) => {
    expect(safeInternalPath(input)).toBe('/');
  });
});
