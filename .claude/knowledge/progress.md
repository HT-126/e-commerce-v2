# Progress

Updated: 2026-10-25  |  Branch: main

## Current focus
- MVP step 3: Accounts (register, sign in, sign out, roles).

## Done
- Shop filters and polish (`feature/shop-filters`, merged): Color (14 groups, `variants.color_group`), Size and Price filters, "Clear filters", search moved into the header, boxless filter controls with one shared panel style, rating under the price on product cards, Home slogans fade in with a soft-edged mask. Verified: server 192 and client 129 tests, lint and build pass; Postman Catalog folder (15 requests) green; checked in a real browser.
- MVP step 2, Catalog (`feature/catalog`, merged): categories, products list, product detail and related API; Home, Shop, category and product pages; sold-out sizes and colors shown disabled; size chart; rating summary.
- MVP step 1, Foundation and data: Docker MySQL, migrations, dataset seed (8 categories, 2,242 products, 2,174 with a size chart, 17,022 variants, 2 users, 1 order), health endpoint, CI file.
- `/plan-project`: the 3 "(Default)" values (shipping fee, cookie length, rate limits) confirmed by the owner.
- Spec, business rules, data model, API contract and dataset rules written (template v7).

## In progress
- Nothing. `main` has everything merged and passing, and is not pushed yet (the remote is empty).

## Next steps
1. Push `main` (the owner does this) and check that CI is green. It has never run.
2. Accounts with `add-feature`: register, login, logout, `/me`, JWT cookie, rate limits (`rate-limit.js` is ready, `require-auth.js` is a stub), then the header Account icon.
3. Then Cart (step 4): the product page "Add to bag" only checks the size until then.

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- Client linter is oxlint (Vite template default), not ESLint.
- "Add to bag" does nothing after the size check (cart is step 4). Header Account and Bag icons, and the product page review list, come with Accounts, Cart and Reviews.
- Dev database: never run `npm run migrate:rollback` with a single batch (it drops every table). Use `npx knex migrate:down` for one step.
