# Progress

Updated: 2026-10-26  |  Branch: main

## Current focus
- All 7 MVP steps are built and merged. Next: push, check the owner's checklists, run with Docker, deploy.

## Done
- MVP step 7, Admin (`feature/admin`, merged `14c66aa`): everything under `/api/admin` is guarded once by `requireAdmin` (role read from the database). Products (list, create, edit with photo replace), variants (add, color, size, exact stock), orders (status changes with `allowedStatuses`; cancel gives the stock back once, order row locked), reviews (list, delete, rating recomputed). A lazy-loaded `/admin` area (shadcn/ui, TanStack Table v9 `DataTable`, product form, variants table, confirm dialogs, toasts). A product is hidden or shown with a button, never deleted; colors and sizes have no status (stock 0 shows Sold out). A `401 UNAUTHORIZED` from any request now turns the user into a guest, so a session that ended is sent to sign in. Verified on `main`: server 654 and client 589 tests, lint and build pass; two `code-reviewer` runs found no Must fix and their Should fix items are fixed. The owner saw the admin pages work. Not confirmed: the Postman Admin folder and the Admin UI checklist.
- MVP step 6, Reviews (`feature/reviews`, merged `0760a52`): public list, write, edit and delete your own review; only a `delivered` order of the same user and product can review; the shown rating and count are recomputed in one transaction. Postman Reviews folder and Reviews UI checklist not confirmed.
- MVP step 5, Pay and orders (`feature/orders`, merged `a172d79`): mock payment in one transaction, double Pay makes one order, order list and detail, confirmation and history pages. The owner confirmed Pay works. Postman Orders folder and Orders UI checklist not confirmed.
- MVP step 4, Cart (`feature/cart`, merged `3b446ec`): guest bag (50 lines max), signed-in bag, merge after sign in, Bag icon, `/cart`. Postman Cart folder run by the owner; Cart UI checklist not confirmed.
- MVP step 3, Accounts (`feature/accounts`, merged): register, login, logout, `/me`; JWT in an httpOnly cookie; rate limits; Account panel and Admin link.

## In progress
- Nothing. `main` has everything merged and passing. Cart, Orders, Reviews and Admin are not pushed (`origin/main` is still `4dfa512`).

## Next steps
1. Push `main` (the owner does this) and check that CI is green. It has not run on Cart, Orders, Reviews or Admin.
2. The owner runs the Postman Orders, Reviews and Admin folders and the Cart, Orders, Reviews and Admin UI checklists, and reports problems.
3. `/docker-app` (the owner types it): one command that runs the database, the API and the built client together. Then follow `deploy-checklist.md`.
4. Delete the merged branches (`feature/accounts`, `cart`, `orders`, `reviews`, `admin`) once the owner agrees.

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- Client linter is oxlint (Vite template default), not ESLint. Its config skips the generated `src/components/ui/` folder.
- `npx shadcn add` also installs `cn` and `next-themes`, which are not approved: after adding a component remove both, import `cn` from `@/lib/utils` and drop `next-themes` from `sonner.jsx`, as was done for the current files.
- Dev database: never run `npm run migrate:rollback` with a single batch (it drops every table). Use `npx knex migrate:down` for one step.
- After adding a route or file in `server/`, restart `npm run dev` there: `node --watch` missed new routes three times (orders, reviews, admin), and the pages then failed with a 404 or a generic message. Rate limit counters also reset on restart. Importing the Postman collection again clears its variables (see `postman/README.md`).
- Cart merge is not atomic: it reads the account quantity, then writes the larger one. A change to the same line from another tab during the merge can be overwritten. Fix later with one raw MySQL upsert (`LEAST(9, GREATEST(...))`).
- With two tabs open, a tab with the old guest bag can merge it again after the user lowered a quantity, which raises the line back.
- Accessibility polish: Cart focus is lost after Remove and changes are not announced; the "Added to your bag" and "Please choose a rating." messages are not announced or tied to their fields for some screen readers.
- The 50-line bag limit is kept by the browser only (see `decisions.md`). A rare MySQL deadlock while paying gives a plain 500 (no retry).
- The guest "Sign in" link under a product's reviews drops the `#reviews` anchor. "Write a review" shows on a delivered order's items even when the item is already reviewed or its product is now hidden.
- The admin screen locks a product's slug, but the API (`PATCH /api/admin/products/:id`) still accepts a new one; renaming it breaks the links in old orders.
- Admin product form: when two admins edit the same product at once, the last save overwrites the other's edits to fields they did not touch (the form sends every field and the whole photo list).
- Admin variants table: a stock box keeps the number it first showed, so if an order changes the stock meanwhile the box is out of date and Save turns on without the owner typing.
- Two "Add variant" requests at the same moment can get the same display position (the order stays stable, sorted by id).
- A server error that names one line of a list field (for example `highlights.2`) shows only the generic "Please check the form" toast.
- The variants table has `role="alert"` on a table cell, which screen readers announce unevenly.
- The main product photo can only be changed by retyping the photo addresses (there is no reordering).
- Anything typed in the product form while a save is running is lost when the form resets to the saved values.
