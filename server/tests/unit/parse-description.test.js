import { describe, expect, it } from 'vitest';
import { parseDescription } from '../../db/seed-lib/parse-description.js';

const html = `
<p class="lvo-hook">A relaxed &amp; easy dress.</p>
<ul class="lvo-benefits"><li>Soft fabric</li><li>Easy fit</li></ul>
<h2>Fit &amp; sizing</h2>
<p>True to size.</p>
<table>
  <thead><tr><th>Size</th><th>Bust</th></tr></thead>
  <tbody><tr><td>XXL</td><td>44</td></tr><tr><td>One size</td><td>46</td></tr></tbody>
</table>
<h2>Wear it with</h2>
<p>White sneakers.</p>`;

describe('parseDescription', () => {
  it('reads each part as plain text', () => {
    const parsed = parseDescription(html);

    expect(parsed.description).toBe('A relaxed & easy dress.');
    expect(parsed.highlights).toEqual(['Soft fabric', 'Easy fit']);
    expect(parsed.sizingNotes).toBe('True to size.');
    expect(parsed.stylingNote).toBe('White sneakers.');
  });

  it('builds the size chart and cleans the size cells', () => {
    expect(parseDescription(html).sizeChart).toEqual({
      headers: ['Size', 'Bust'],
      rows: [
        ['2XL', '44'],
        ['One Size', '46'],
      ],
    });
  });

  it('ignores a table whose first header is not Size', () => {
    const model =
      '<table><tr><th>Model Type</th><th>Height</th></tr><tr><td>Curvy</td><td>5.8</td></tr></table>';

    expect(parseDescription(model).sizeChart).toBeNull();
  });

  it('gives null for missing parts', () => {
    expect(parseDescription('<p>Nothing here</p>')).toEqual({
      description: null,
      highlights: null,
      sizingNotes: null,
      stylingNote: null,
      sizeChart: null,
    });
  });
});
