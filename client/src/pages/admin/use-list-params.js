import { useSearchParams } from 'react-router';

const MAX_PAGE = 10000;

// The page, the sort and the filters of an admin list live in the URL, so a refresh or a shared link shows the
// same list. `update` writes some of them; anything but the page itself sends the list back to page 1.
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1));
  const get = (key) => searchParams.get(key) ?? '';

  function update(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === undefined || value === null) next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    if (next.get('page') === '1') next.delete('page');
    setSearchParams(next);
  }

  return { page, get, update };
}
