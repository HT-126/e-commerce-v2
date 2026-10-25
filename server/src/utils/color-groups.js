// Groups the ~500 raw color names of the dataset into a few base colors for the shop filter.
// Rules: .claude/knowledge/dataset.md (Color groups). Pure functions, so they are easy to test.

export const COLOR_GROUPS = [
  { key: 'black', label: 'Black' },
  { key: 'white', label: 'White' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'brown', label: 'Brown' },
  { key: 'gray', label: 'Gray' },
  { key: 'red', label: 'Red' },
  { key: 'pink', label: 'Pink' },
  { key: 'orange', label: 'Orange' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
  { key: 'blue', label: 'Blue' },
  { key: 'purple', label: 'Purple' },
  { key: 'multicolor', label: 'Multicolor' },
  { key: 'other', label: 'Other' },
];

// Patterns and mixes win over any single color: "Blue Floral" is a print, not blue.
const PATTERN =
  /\b(multi|multicolor|multicolour|combo|mix|tie dye|tiedye|floral|flowers?|leopard|zebra|plaid|check|stripes?|print|pattern|camo|camouflage|rainbow|painted|painting|spot|feathers|leaves|colorful|hologram)\b/;

// Tier 1: the plain color words. They decide first ("Blush Pink" is pink, "Black Forest" is black).
const BASIC = {
  black: 'black',
  white: 'white',
  wht: 'white',
  gray: 'gray',
  grey: 'gray',
  brown: 'brown',
  red: 'red',
  pink: 'pink',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  purple: 'purple',
  beige: 'neutral',
  cream: 'neutral',
  ivory: 'neutral',
  khaki: 'neutral',
  tan: 'neutral',
  camel: 'neutral',
  taupe: 'neutral',
};

// Tier 2: shade words, used only when a part has no plain color word ("Sage", "Burgundy").
const SHADE_WORDS = {
  neutral:
    'mocha caramel sand oatmeal natural ecru eggshell champagne nude latte cappuccino vanilla almond stone oyster storm',
  brown: 'chocolate coffee chestnut cinnamon hazelnut bronze rum walnut espresso cocoa',
  gray: 'charcoal silver graphite sleet pewter cement lunar slate',
  red: 'burgundy wine merlot cabernet marsala cherry ruby scarlet tomato brick crimson maroon rouge',
  pink: 'blush rose fuchsia fuchisa fuch magenta cerise carnation candy strawberry flamingo watermelon lotus',
  orange: 'coral peach apricot salmon tangerine pumpkin terracotta rust ginger sherbet mango clay',
  yellow: 'gold mustard lemon banana curry ochre brass',
  green:
    'sage olive moss army forest hunter emerald lime matcha pistachio avocado seafoam chartreuse jade mint gum',
  blue: 'navy denim indigo cobalt cobald royal azure cerulean sky aqua teal turquoise peacock ocean tiffany peri',
  purple: 'lilac lavender violet orchid plum mauve heliotrope berry periwinkle',
};

const SHADES = new Map(
  Object.entries(SHADE_WORDS).flatMap(([group, list]) => list.split(' ').map((word) => [word, group])),
);

const firstMatch = (tokens, lookup) => {
  for (const token of tokens) {
    const group = lookup(token);
    if (group) return group;
  }
  return null;
};

// One part of a name, for example "Light Blue" or "Dusty Rose".
function groupOfPart(part) {
  const tokens = part.split(/[^a-z]+/).filter(Boolean);
  return firstMatch(tokens, (t) => BASIC[t]) ?? firstMatch(tokens, (t) => SHADES.get(t)) ?? null;
}

// "Black/Mauve" and "Orange-Red": the first part that matches decides.
export function colorGroupFor(colorName) {
  const name = String(colorName ?? '')
    .toLowerCase()
    .replace(/[-/.]/g, ' ');
  if (PATTERN.test(name)) return 'multicolor';

  const parts = String(colorName ?? '')
    .toLowerCase()
    .split(/[/-]/);
  for (const part of parts) {
    const group = groupOfPart(part.replace(/\./g, ' '));
    if (group) return group;
  }
  return 'other';
}
