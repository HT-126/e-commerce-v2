# Progress

Updated: 2026-10-25  |  Branch: main

## Current focus
- MVP step 2: Catalog (Home, shop, category and product pages).

## Done
- MVP step 1, Foundation and data (`/setup-project`): Docker MySQL, 9 migrations, dataset seed, health endpoint, client shell, CI file. Verified: MySQL healthy, `db:reset` gives 8 categories, 2,242 products, 17,022 variants, 2 users, 1 order; re-seed skips; server 30 tests and client 2 tests pass; lint and build pass; Postman health 200; home page shows status; hook blocks `.ts`.
- `/plan-project`: the 3 "(Default)" values (shipping fee, cookie length, rate limits) confirmed by the owner.
- Spec, business rules, data model, API contract and dataset rules written (template v7).

## In progress
- Nothing yet.

## Next steps
1. Plan the Catalog feature with `add-feature` (API first: `GET /api/categories`, `GET /api/products`, `GET /api/products/:slug`).

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- Client linter is oxlint (Vite template default), not ESLint.
