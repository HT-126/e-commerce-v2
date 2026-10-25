# Progress

Updated: 2026-10-25  |  Branch: main

## Current focus
- MVP step 7: Admin (not started). It is the last MVP step.

## Done
- MVP step 6, Reviews (`feature/reviews`, merged `0760a52`): `GET /api/products/:slug/reviews` (public, only reviews with a comment, paged), `GET`/`PUT`/`DELETE .../reviews/mine`; only a `delivered` order of the same user and product can review (checked on save, not on delete); the shown rating and count are recomputed in the same transaction with the product row locked; product page list, write, edit, delete; "Write a review" link on delivered orders. Verified on `main`: server 457 and client 367 tests, lint and build pass; `code-reviewer` found no Must fix. The owner saw the not-bought message for `paid` orders. Not confirmed: the Postman Reviews folder and the Reviews UI checklist.
- MVP step 5, Pay and orders (`feature/orders`, merged `a172d79`): `POST /api/orders` (mock payment in one transaction, stock taken in variant order, double Pay makes one order), order list and detail, Pay button, confirmation and history pages, `RequireUser`. The owner confirmed Pay works. Postman Orders folder and Orders UI checklist not confirmed.
- MVP step 4, Cart (`feature/cart`, merged `3b446ec`): guest bag (50 lines max) priced by `POST /api/cart/quote`, signed-in bag, merge after sign in, Bag icon, `/cart`. Postman Cart folder run by the owner; Cart UI checklist not confirmed.
- MVP step 3, Accounts (`feature/accounts`, merged): register, login, logout, `/me`; JWT in an httpOnly cookie; rate limits; Account panel and Admin link.
- Shop filters and polish (`feature/shop-filters`, merged): Color (14 groups), Size, Price, Clear filters, header search.

## In progress
- Nothing. `main` has everything merged and passing. Cart, Orders and Reviews are not pushed (`origin/main` is still `4dfa512`).

## Next steps
1. Push `main` (the owner does this) and check that CI is green with Cart, Orders and Reviews.
2. The owner runs the Postman Orders and Reviews folders and the Cart, Orders and Reviews UI checklists, and reports problems.
3. Admin with `add-feature`: products, variants and stock, orders (status changes, cancel restocks), reviews (delete uses `recomputeRating` in `reviews.service.js`). Setting an order to `delivered` there is what lets a new order be reviewed.

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- Client linter is oxlint (Vite template default), not ESLint.
- The Admin link goes to `/admin`, which shows "Page not found" until step 7.
- Until step 7 nothing in the app marks an order `delivered`, so only the seeded demo order (`demo@gmail.com`, 2 products) can review. New orders stay `paid` and show "Only customers who bought this item can review it." (expected).
- Dev database: never run `npm run migrate:rollback` with a single batch (it drops every table). Use `npx knex migrate:down` for one step.
- After adding a route or file in `server/`, restart `npm run dev` there: `node --watch` missed the orders route once, and Pay then failed with a generic message. Rate limit counters also reset on restart. Importing the Postman collection again clears its variables (see `postman/README.md`).
- Cart merge is not atomic: it reads the account quantity, then writes the larger one. A change to the same line from another tab during the merge can be overwritten. Fix later with one raw MySQL upsert (`LEAST(9, GREATEST(...))`).
- With two tabs open, a tab with the old guest bag can merge it again after the user lowered a quantity, which raises the line back.
- Accessibility polish: Cart focus is lost after Remove and changes are not announced; the "Added to your bag" and "Please choose a rating." messages are not announced or tied to their fields for some screen readers.
- The 50-line bag limit is kept by the browser only (see `decisions.md`). A rare MySQL deadlock while paying gives a plain 500 (no retry).
- A session that ends while the user is on `/account/orders` or a product page, or presses Pay, shows an error message, not a redirect to sign in. The guest "Sign in" link under a product's reviews drops the `#reviews` anchor.
- "Write a review" shows on a delivered order's items even when the item is already reviewed or its product is now hidden.
