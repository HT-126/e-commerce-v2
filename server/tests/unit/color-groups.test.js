import { describe, expect, it } from 'vitest';
import { COLOR_GROUPS, colorGroupFor } from '../../src/utils/color-groups.js';

// Real color names from the dataset.
describe('colorGroupFor', () => {
  it.each([
    // plain colors and light/dark shades
    ['Black', 'black'],
    ['White', 'white'],
    ['Off White', 'white'],
    ['Wht', 'white'],
    ['Light Blue', 'blue'],
    ['Dark Gray', 'gray'],
    ['Heather Grey', 'gray'],
    ['Hot Pink', 'pink'],
    ['Dark Green', 'green'],
    // the plain color word wins over a shade word
    ['Blush Pink', 'pink'],
    ['Watermelon Red', 'red'],
    ['Black Forest', 'black'],
    ['Sage Green', 'green'],
    ['Coffee Brown', 'brown'],
    ['Sand Beige', 'neutral'],
    // shade words alone
    ['Burgundy', 'red'],
    ['Navy', 'blue'],
    ['Teal', 'blue'],
    ['Sage', 'green'],
    ['Mocha', 'neutral'],
    ['Camel', 'neutral'],
    ['Dust Storm', 'neutral'],
    ['Gum Leaf', 'green'],
    ['Sherbet', 'orange'],
    ['Mustard', 'yellow'],
    ['Lavender', 'purple'],
    ['Charcoal', 'gray'],
    ['Fuchsia', 'pink'],
    // typos, abbreviations and extra spaces in the data
    ['Fuchisa', 'pink'],
    ['Cobald Blue', 'blue'],
    ['Pastel  Blue', 'blue'],
    ['Lt.blue', 'blue'],
    ['K Green', 'green'],
    ['N.green', 'green'],
    ['H.grey', 'gray'],
    // two colors: the first part decides, and the next part is tried if the first matches nothing
    ['Black/Mauve', 'black'],
    ['White/Black', 'white'],
    ['Orange-Red', 'orange'],
    ['Yellow-Green', 'yellow'],
    ['Navy/Red', 'blue'],
    ['Flami-Flamingo', 'pink'],
    ['Minit/Peach', 'orange'],
    ['Black-Long Sleeve', 'black'],
    ['Dusty Pink/Mauve', 'pink'],
    // patterns and mixes are multicolor, whatever color word they contain
    ['Multicolor', 'multicolor'],
    ['Multi', 'multicolor'],
    ['Floral', 'multicolor'],
    ['Blue Floral', 'multicolor'],
    ['Leopard', 'multicolor'],
    ['Pink Leopard', 'multicolor'],
    ['Tie-Dye', 'multicolor'],
    ['Pastel Tiedye', 'multicolor'],
    ['Plaid', 'multicolor'],
    ['Light Green Stripes', 'multicolor'],
    ['Taupe/Lilac Multi', 'multicolor'],
    ['Teal Combo', 'multicolor'],
    // names with no color in them
    ['Medium', 'other'],
    ['Light', 'other'],
    ['Dk', 'other'],
    ['As Shown', 'other'],
    ['', 'other'],
    [null, 'other'],
    [undefined, 'other'],
  ])('%s -> %s', (name, group) => {
    expect(colorGroupFor(name)).toBe(group);
  });

  it('always returns one of the known group keys', () => {
    const keys = new Set(COLOR_GROUPS.map((g) => g.key));

    for (const name of ['Black', 'Floral', 'Navy/Red', 'Medium', 'Lt.pink/Hot Pink', '123']) {
      expect(keys.has(colorGroupFor(name))).toBe(true);
    }
  });

  it('is not case sensitive', () => {
    expect(colorGroupFor('BLACK/MAUVE')).toBe('black');
    expect(colorGroupFor('dusty rose')).toBe('pink');
  });
});

describe('COLOR_GROUPS', () => {
  it('has unique keys, with "other" last', () => {
    const keys = COLOR_GROUPS.map((g) => g.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.at(-1)).toBe('other');
  });
});
