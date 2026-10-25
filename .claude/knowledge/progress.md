# Progress

Updated: 2026-10-25  |  Branch: main

## Current focus
- MVP step 6: Reviews (not started).

## Done
- MVP step 5, Pay and orders (`feature/orders`, merged `a172d79`): `POST /api/orders` (mock payment in one transaction: conditional stock update in variant order, all or nothing, cart rows locked so a double Pay makes one order), `GET /api/orders`, `GET /api/orders/:orderNumber`; Pay button on `/cart`; confirmation page `/orders/:orderNumber`; history `/account/orders`; "My orders" in the Account panel; `RequireUser` guard. Verified on `main`: server 396 and client 327 tests, lint and build pass; `code-reviewer` Must fix fixed; the owner confirmed Pay works in the browser. Not confirmed: the Postman Orders folder and the Orders UI checklist.
- MVP step 4, Cart (`feature/cart`, merged `3b446ec`): guest bag (Zustand persist, 50 lines max) priced by `POST /api/cart/quote`; signed-in bag in the database; merge after sign in; Bag icon; working "Add to bag"; `/cart` page. The owner ran the Postman Cart folder. Cart UI checklist not confirmed.
- MVP step 3, Accounts (`feature/accounts`, merged): register, login, logout, `/me`; JWT in an httpOnly cookie; rate limits; `/login` and `/register`; Account panel and Admin link.
- Shop filters and polish (`feature/shop-filters`, merged): Color (14 groups), Size, Price, Clear filters, header search.
- MVP step 2, Catalog (`feature/catalog`, merged): categories, products, product detail and related API; Home, Shop and product pages.

## In progress
- Nothing. `main` has everything merged and passing. Cart and Orders are not pushed (`origin/main` is still `4dfa512`).

## Next steps
1. Push `main` (the owner does this) and check that CI is green with Cart and Orders.
2. The owner runs the Postman Orders folder and the Cart and Orders UI checklists, and reports problems.
3. Reviews with `add-feature`: buyers with a `delivered` order rate and comment (`business-rules.md`). Test with the seeded delivered demo order; the admin screens that set `delivered` come in step 7.

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- Client linter is oxlint (Vite template default), not ESLint.
- The Admin link goes to `/admin`, which shows "Page not found" until step 7. The product page review list comes with Reviews.
- Dev database: never run `npm run migrate:rollback` with a single batch (it drops every table). Use `npx knex migrate:down` for one step.
- After adding a route or file in `server/`, restart `npm run dev` there: `node --watch` once missed the orders route, and Pay then failed with a generic message. Rate limit counters also reset on restart. Importing the Postman collection again clears its variables (see `postman/README.md`).
- Cart merge is not atomic: it reads the account quantity, then writes the larger one. A change to the same line from another tab during the merge can be overwritten. Fix later with one raw MySQL upsert (`LEAST(9, GREATEST(...))`).
- With two tabs open, a tab that still holds the old guest bag can merge it again after the other tab merged and the user lowered a quantity, which raises the line back.
- Cart accessibility polish: focus is lost after Remove, quantity and remove changes are not announced, and the "Added to your bag" message is not announced by some screen readers.
- The 50-line bag limit is kept by the browser only; `PUT /api/cart/items/:variantId` does not count lines (see `decisions.md`).
- A session that ends while the user is on `/account/orders` or presses Pay shows an error message, not a redirect to sign in. A rare MySQL deadlock while paying gives a plain 500 (no retry).
