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
    ['a backslash that browsers read as a slash', '/\\evil.example'],
    ['a slash, a backslash and a host', '/\\/evil.example'],
    ['a tab before the second slash', '/\t/evil.example'],
    ['a line break inside the path', '/shop\n/evil.example'],
    ['a control character', '/shop\u0000'],
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
