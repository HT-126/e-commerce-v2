# Progress

Updated: 2026-10-25  |  Branch: main

## Current focus
- MVP step 4: Cart (guest and signed in): add, change quantity, remove, merge on sign in.

## Done
- MVP step 3, Accounts (`feature/accounts`, merged): register, login, logout, `/me`; JWT in an httpOnly cookie (1 day, 30 with "Keep me signed in"); user loaded from the database on every request; rate limits; `/login` and `/register` pages; header Account panel and Admin link. Verified: server 296 and client 222 tests, lint and build pass; Postman Accounts folder green; 34 real-browser checks.
- Shop filters and polish (`feature/shop-filters`, merged): Color (14 groups), Size, Price, Clear filters, header search, boxless filters, rating under the price, Home slogans mask fade.
- MVP step 2, Catalog (`feature/catalog`, merged): categories, products, product detail and related API; Home, Shop and product pages.
- MVP step 1, Foundation and data: Docker MySQL, migrations, dataset seed (2,242 products, 2,174 with a size chart, 17,022 variants), health endpoint, CI file.
- `/plan-project`: shipping fee, cookie length and rate limits confirmed by the owner.

## In progress
- Nothing. `main` has everything merged and passing, and is not pushed yet (the remote is empty).

## Next steps
1. Push `main` (the owner does this) and check that CI is green. It has never run.
2. Cart with `add-feature`: guest cart in the browser (Zustand persist) + `POST /api/cart/quote`, signed-in cart, `POST /api/cart/merge` right after sign in or register, header Bag icon, "Add to bag" really adds.
3. Then Pay and orders (step 5).

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- Client linter is oxlint (Vite template default), not ESLint.
- "Add to bag" only checks the size (cart is step 4). The Admin link goes to `/admin`, which shows "Page not found" until step 7. The Bag icon and the product page review list come with Cart and Reviews.
- Dev database: never run `npm run migrate:rollback` with a single batch (it drops every table). Use `npx knex migrate:down` for one step.
- Rate limit counters live in the API's memory: restart `npm run dev` in `server/` to reset them. Importing the Postman collection again clears its variables (see `postman/README.md`).
- Cart merge is not atomic: it reads the account quantity, then writes the larger one. A change to the same line from another tab during the merge can be overwritten. Fix later with one raw MySQL upsert (`LEAST(9, GREATEST(...))`).
- With two tabs open, a tab that still holds the old guest bag can merge it again after the other tab merged and the user lowered a quantity, which raises the line back.
- Cart accessibility polish: focus is lost after Remove, quantity and remove changes are not announced, and the "Added to your bag" message is not announced by some screen readers.
