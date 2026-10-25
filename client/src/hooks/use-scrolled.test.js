import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useScrolled } from './use-scrolled.js';

function scrollTo(y) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

afterEach(() => scrollTo(0));

describe('useScrolled', () => {
  it('is false at the top of the page', () => {
    const { result } = renderHook(() => useScrolled());

    expect(result.current).toBe(false);
  });

  it('becomes true after scrolling down, and false again at the top', () => {
    const { result } = renderHook(() => useScrolled());

    scrollTo(1);
    expect(result.current).toBe(true);

    scrollTo(0);
    expect(result.current).toBe(false);
  });

  it('starts true when the page is already scrolled', () => {
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });

    const { result } = renderHook(() => useScrolled());

    expect(result.current).toBe(true);
  });

  it('waits for the threshold', () => {
    const { result } = renderHook(() => useScrolled(50));

    scrollTo(50);
    expect(result.current).toBe(false);

    scrollTo(51);
    expect(result.current).toBe(true);
  });

  it('stops listening when it is removed', () => {
    const { result, unmount } = renderHook(() => useScrolled());
    unmount();

    scrollTo(500);

    expect(result.current).toBe(false);
  });
});
