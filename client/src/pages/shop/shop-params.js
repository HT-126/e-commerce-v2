// What the Shop page keeps in the URL, read safely. Anyone can type anything in the address bar, so a
// value the API would reject falls back to the default instead of showing an error that Retry cannot fix.

export const LIMIT = 12;

// Same limits as the API schema.
const MAX_PAGE = 10000;
const MAX_QUERY_LENGTH = 100;
const MAX_COLORS = 15;
const MAX_SIZES = 20;
const MAX_ITEM_LENGTH = 20;

export const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

// The lower limit is included, the upper limit is not: "$25-$50" is 2500 to 4999 cents.
export const PRICE_RANGES = [
  { key: 'any', label: 'Any price' },
  { key: 'under-25', label: 'Under $25', maxPriceCents: '2499' },
  { key: '25-50', label: '$25-$50', minPriceCents: '2500', maxPriceCents: '4999' },
  { key: '50-75', label: '$50-$75', minPriceCents: '5000', maxPriceCents: '7499' },
  { key: '75-100', label: '$75-$100', minPriceCents: '7500', maxPriceCents: '9999' },
  { key: '100-plus', label: '$100+', minPriceCents: '10000' },
];

// "black, White,black" becomes ['black', 'white']. Items that are too long are dropped.
function readList(value, { lower = false, max }) {
  const items = (value ?? '')
    .split(',')
    .map((item) => (lower ? item.trim().toLowerCase() : item.trim()))
    .filter((item) => item !== '' && item.length <= MAX_ITEM_LENGTH);
  return [...new Set(items)].slice(0, max);
}

function readPage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

export function readShopParams(searchParams) {
  const sort = searchParams.get('sort');
  const min = searchParams.get('minPriceCents') ?? '';
  const max = searchParams.get('maxPriceCents') ?? '';

  return {
    sort: SORTS.some((s) => s.value === sort) ? sort : 'newest',
    // Only a pair that is exactly one of the choices counts. Anything else is "any price".
    price:
      PRICE_RANGES.find((r) => (r.minPriceCents ?? '') === min && (r.maxPriceCents ?? '') === max) ??
      PRICE_RANGES[0],
    color: readList(searchParams.get('color'), { lower: true, max: MAX_COLORS }),
    size: readList(searchParams.get('size'), { max: MAX_SIZES }),
    q: (searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH),
    page: readPage(searchParams.get('page')),
  };
}

// "Clear filters" has something to clear: Color, Size, Price or the search text.
export const hasActiveFilters = (params) =>
  params.color.length > 0 || params.size.length > 0 || params.price.key !== 'any' || params.q !== '';

// The values "Clear filters" removes from the URL. The category (in the path) and the sort stay.
export const CLEARED_FILTERS = { color: '', size: '', minPriceCents: '', maxPriceCents: '', q: '' };

export function toApiParams(category, params) {
  return {
    category,
    sort: params.sort,
    minPriceCents: params.price.minPriceCents,
    maxPriceCents: params.price.maxPriceCents,
    color: params.color.join(','),
    size: params.size.join(','),
    q: params.q,
    page: params.page,
    limit: LIMIT,
  };
}
