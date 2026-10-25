// Cleaning rules from .claude/knowledge/dataset.md.

// "BLACK/MAUVE" -> "Black/Mauve". Different colors are never merged.
export function cleanColor(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/(^|[\s/(-])(\p{L})/gu, (match, separator, letter) => separator + letter.toUpperCase());
}

const SIZE_FIXES = { XXL: '2XL', XXXL: '3XL', SM: 'S/M', ML: 'M/L' };

// Only these fixes. Number sizes (`8`, `0(24)`) and plus sizes (`16W`) are real sizes.
export function cleanSize(value) {
  const size = String(value).trim();
  if (/^one\s?size$/i.test(size)) return 'One Size';
  return SIZE_FIXES[size] ?? size;
}
