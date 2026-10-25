# Dataset and Import Rules

Source: Women's Fashion Catalog Open Data (Livostyle), MIT license.
Repo: `https://github.com/arturayupov/womens-fashion-catalog-open-data`

## Pinned version
The repo updates every Sunday. Always import the same version so seeds give the same result.
- Commit: `0ce98ce4412b0c7b6b76d8fe809c1e78c7e16b5f`
- File URL: `https://raw.githubusercontent.com/arturayupov/womens-fashion-catalog-open-data/0ce98ce4412b0c7b6b76d8fe809c1e78c7e16b5f/data/products.json`
- `npm run data:download` saves it to `server/db/data/products.json` (git-ignored, about 30 MB).
- Change the pinned commit only on purpose, then re-check the numbers below.

## What the file contains (checked on the pinned commit)
- 2,938 products, 20,766 variants. All prices in USD.
- Every variant has exactly two options: `Color` and `Size`. No duplicate (product, color, size). No duplicate SKU or handle.
- All variants of a product have the same price. `compare_at_price_usd` is always null (no sale prices).
- Stock: only `in_stock` (true/false). No stock numbers.
- Colors: names only, no color codes. Many spellings (`BLACK/MAUVE`, `Ash Mocha`, `AS SHOWN`).
- `description` (plain text) is the HTML with tags removed, so tables and headings run together. Do not show it. Use `description_html` and parse it (below).
- Size chart: 2,178 of the 2,242 kept products have one `<table>` inside `description_html` (first header `Size`, then columns such as Bust, Waist, Hip, Length; values in inches). Columns differ per product.
- Ratings: `reviews: { rating, count }` aggregate only, no review texts. Some products have `rating: null`.
- Images: 1 to 8 per product, hosted on Shopify's CDN (not in the repo). Each has `url`, `alt`, `width`, `height`.

## Which products we import
Only clothing. Keep a product when `category.full_path` split by ` > ` has `Clothing` as part 2 and part 3 is in the map below. Skip everything else (jewelry, shoes, belts, hats, sunglasses, socks, lingerie, sleepwear).

Result: 2,242 products, 17,022 variants.

## Category map (flat, no sub-categories)
| `full_path` part 3 | Our category | slug | Products |
|---|---|---|---|
| Clothing Tops | Tops | `tops` | 724 |
| Dresses | Dresses | `dresses` | 671 |
| Pants, Shorts, Skirts | Bottoms | `bottoms` | 226 |
| Outfit Sets | Sets | `sets` | 224 |
| One-Pieces | Jumpsuits & Rompers | `jumpsuits-rompers` | 149 |
| Swimwear | Swimwear | `swimwear` | 124 |
| Outerwear | Outerwear | `outerwear` | 67 |
| Activewear | Activewear | `activewear` | 57 |

Header menu order = table order.

## Field mapping
| Source | Our column |
|---|---|
| `id` | `products.source_id` (string) |
| `handle` | `products.slug` |
| `title` | `products.title` |
| `description_html` → `<p class="lvo-hook">` text | `products.description` (fallback: `metafields.ai_summary`) |
| `description_html` → `<ul class="lvo-benefits">` items | `products.highlights` (JSON array of strings, usually 3) |
| `description_html` → paragraph after `<h2>Fit &amp; sizing</h2>` | `products.sizing_notes` (fallback: `metafields.sizing_notes`) |
| `description_html` → paragraph after `<h2>Wear it with</h2>` | `products.styling_note` |
| `description_html` → first `<table>` | `products.size_chart` (JSON, see below) |
| `price.min_usd` | `products.price_cents` = `Math.round(min_usd * 100)` |
| `reviews.rating`, `reviews.count` | `products.seed_rating_avg`, `products.seed_review_count` (null rating means 0 count) |
| `metafields.material`, `care`, `fit`, `length`, `closure`, `season`, `pattern` | same names on `products` (empty string means null) |
| `created_at` | `products.created_at` (so "New arrivals" is real) |
| `images[i]` | `product_images` with `position = i` |
| `variants[i].sku` | `variants.sku` |
| `variants[i].options.Color` | `variants.color_name` (cleaned, see below) |
| `variants[i].options.Size` | `variants.size` (cleaned, see below) |
| `variants[i]` order | `variants.position = i` (the source order is already a good size order) |
| `variants[i].in_stock` | `variants.stock`: `true` means 10, `false` means 0 |

## Parsing `description_html` (seed only)
- Use `node-html-parser` (server dependency, approved; not a devDependency, so the Docker image can seed). Take only text: decode entities (`&amp;` to `&`), trim, never store HTML.
- `size_chart` = `{ "headers": ["Size", "Bust", ...], "rows": [["S", "34.6", ...], ...] }`. Keep it only when the first header starts with `Size`; otherwise null. Clean the size cells with the same size rules as variants.
- If a part is missing, store null (64 products have no table, 17 have no highlights).

## Cleaning
- Color: trim, then Title Case each word and each part around `/` and `-` (`BLACK/MAUVE` becomes `Black/Mauve`). Keep the meaning, do not merge different colors.
- Size: trim, then only these fixes: `One size`, `onesize` to `One Size`; `XXL` to `2XL`; `XXXL` to `3XL`; `SM` to `S/M`; `ML` to `M/L`. Keep every other value as it is (number sizes like `8`, `0(24)` and plus sizes like `16W` are real sizes).
- If cleaning makes two variants of one product equal (same color and size), keep the first and log a warning.

## Color groups (for the shop filter)
`variants.color_group` is set from the cleaned `color_name` by `colorGroupFor()` in `server/src/utils/color-groups.js` (the seed, the migration backfill and, later, admin use the same function).
- Groups, in display order: `black`, `white`, `neutral` (beige, cream, ivory, khaki, tan, camel, taupe, mocha, sand...), `brown`, `gray`, `red` (red, burgundy, wine, scarlet...), `pink`, `orange`, `yellow`, `green`, `blue` (navy, teal, turquoise...), `purple`, `multicolor` (floral, leopard, print, multicolor...), `other`.
- Ordered keyword rules. For names like `Black/Mauve` the first part decides; if it matches nothing, the next part is tried. Anything unmatched is `other`.
- Goal: `other` stays under about 5% of variants. Measured on the pinned dataset: 260 of 17,022 variants (1.5%), all names that carry no color (`Medium`, `Light`, `Dark`, `Color`, `As Shown`...).

## Seed rules
- Seed script order: categories, products, images, variants, users, demo order. Insert in batches (`knex.batchInsert`, 500 rows).
- The seed runs only on an empty database. If products already exist, it prints "Seed skipped: database not empty" and exits with code 0. Orders point to products, so the catalog cannot be emptied alone.
- Full reset (dev only): `npm run db:reset` = `knex migrate:rollback --all && knex migrate:latest && knex seed:run`.
- Demo order: the demo customer gets one `delivered` order with 2 products, so reviews can be tested right away. Its stock is not taken from the variants.
- Test variant: after import, set `stock = 1` on the first in-stock variant of the product with the smallest `source_id`, and print its SKU. It is used to test the last-item case.
- Footer credit while this data is used: "Product data: Women's Fashion Catalog Open Data (MIT license)".
