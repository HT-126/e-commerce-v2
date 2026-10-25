# Progress

Updated: 2026-10-25  |  Branch: main

## Current focus
- MVP step 5: Pay and orders (not started).

## Done
- MVP step 4, Cart (`feature/cart`, merged `3b446ec`): guest bag in the browser (Zustand persist, 50 lines max) priced by `POST /api/cart/quote`; signed-in bag in the database (`GET /api/cart`, `PUT`/`DELETE /api/cart/items/:variantId`); `POST /api/cart/merge` right after sign in or register (a `400` empties the browser bag); header Bag icon with item count; working "Add to bag"; `/cart` page (no Pay button yet). Verified on `main`: server 361 and client 290 tests, lint and build pass; `code-reviewer` found no "Must fix"; the owner ran the Postman Cart folder. Not confirmed: the Cart UI checklist (390px and 1280px), no real-browser check was done.
- MVP step 3, Accounts (`feature/accounts`, merged): register, login, logout, `/me`; JWT in an httpOnly cookie; rate limits; `/login` and `/register` pages; header Account panel and Admin link.
- Shop filters and polish (`feature/shop-filters`, merged): Color (14 groups), Size, Price, Clear filters, header search.
- MVP step 2, Catalog (`feature/catalog`, merged): categories, products, product detail and related API; Home, Shop and product pages.
- MVP step 1, Foundation and data: Docker MySQL, migrations, dataset seed (2,242 products, 17,022 variants), health endpoint, CI file.

## In progress
- Nothing. `main` has everything merged and passing. The Cart merge is not pushed yet (CI was green on `4dfa512`, before Cart).

## Next steps
1. Push `main` (the owner does this) and check that CI is green with Cart.
2. The owner goes through the Cart UI checklist (390px and 1280px) and reports problems.
3. Pay and orders with `add-feature`: "Pay" button on `/cart`, mock payment, confirmation, order history, and the stock-1 race test (`test-plan.md`).

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- Client linter is oxlint (Vite template default), not ESLint.
- The Admin link goes to `/admin`, which shows "Page not found" until step 7. The product page review list comes with Reviews.
- Dev database: never run `npm run migrate:rollback` with a single batch (it drops every table). Use `npx knex migrate:down` for one step.
- Rate limit counters live in the API's memory: restart `npm run dev` in `server/` to reset them. Importing the Postman collection again clears its variables (see `postman/README.md`).
- Cart merge is not atomic: it reads the account quantity, then writes the larger one. A change to the same line from another tab during the merge can be overwritten. Fix later with one raw MySQL upsert (`LEAST(9, GREATEST(...))`).
- With two tabs open, a tab that still holds the old guest bag can merge it again after the other tab merged and the user lowered a quantity, which raises the line back.
- Cart accessibility polish: focus is lost after Remove, quantity and remove changes are not announced, and the "Added to your bag" message is not announced by some screen readers.
- The 50-line bag limit is kept by the browser only; `PUT /api/cart/items/:variantId` does not count lines (see `decisions.md`).
