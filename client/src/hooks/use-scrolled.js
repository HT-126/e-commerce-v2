import { useEffect, useState } from 'react';

// True once the page is scrolled down more than `threshold` pixels. Used for the header shadow.
export function useScrolled(threshold = 0) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update(); // a reload in the middle of a page starts already scrolled
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);

  return scrolled;
}
