import { parse } from 'node-html-parser';
import { cleanSize } from './clean.js';

// Text only: entities are decoded, HTML is never stored.
const textOf = (node) => (node ? node.text.replace(/\s+/g, ' ').trim() : '');

// Paragraph right after an <h2> with this title, for example "Fit & sizing".
function paragraphAfterHeading(root, title) {
  const heading = root.querySelectorAll('h2').find((h) => textOf(h).toLowerCase() === title);
  const next = heading?.nextElementSibling;
  return next?.tagName === 'P' ? textOf(next) || null : null;
}

// Kept only when the first header starts with "Size". Size cells use the same rules as variants.
function parseSizeChart(root) {
  const table = root.querySelector('table');
  if (!table) return null;

  const rows = table.querySelectorAll('tr').map((tr) => tr.querySelectorAll('th, td').map(textOf));
  const [headers, ...body] = rows;
  if (!headers?.[0]?.toLowerCase().startsWith('size')) return null;

  return { headers, rows: body.map(([size, ...rest]) => [cleanSize(size), ...rest]) };
}

export function parseDescription(html) {
  const root = parse(html ?? '');
  const highlights = root.querySelectorAll('ul.lvo-benefits li').map(textOf).filter(Boolean);

  return {
    description: textOf(root.querySelector('p.lvo-hook')) || null,
    highlights: highlights.length > 0 ? highlights : null,
    sizingNotes: paragraphAfterHeading(root, 'fit & sizing'),
    stylingNote: paragraphAfterHeading(root, 'wear it with'),
    sizeChart: parseSizeChart(root),
  };
}
