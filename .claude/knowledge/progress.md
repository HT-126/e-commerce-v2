# Progress

Updated: 2026-10-26  |  Branch: main

## Current focus
- All 7 MVP steps, the Docker run and the staging preparation are built and merged. Staging is live on Render + Aiven (`https://e-commerce-v2-2ceg.onrender.com/`). Next: the owner's smoke test on staging, then the owner's remaining checks. Production is not chosen or started.

## Done
- Staging (`feature/staging-prep`, merged `52db6c2`; README and screenshots `71087ef`): new optional `DB_SSL` / `DB_SSL_CA` (TLS to a hosted database, CA text on one line with `\n`, no quotes); `DB_NAME_TEST` is required only outside production; `docker-start.sh` migrates, then downloads and seeds only when the catalog is empty (`scripts/catalog-state.js`). Staging: app on Render (free Docker web service) + MySQL on Aiven (free), cost $0, sleeps after 15 min and wakes in about a minute; decision in `decisions.md`, owner steps in `deploy-checklist.md`. Verified: server 698 tests, client 589, lint, build; a 512 MB container with an empty database downloads, seeds and listens (no OOM, about 35 MB at rest); the live site answers: home 200, `/api/health` ok, 2,242 products, deep link 200, unknown `/api/*` JSON 404, `/api/admin/*` 401 when signed out, HSTS and CSP headers. Not checked by me: signing in, Pay and the admin area on staging (needs the owner's passwords).
- README for the portfolio (`71087ef`): pitch, live link, 5 screenshots in `docs/screenshots/`, features, stack, Mermaid architecture, project structure, database, API design, demo logins, run locally, common problems, tests, security notes, data credit.
- Docker run (`feature/docker-app`, merged `663fd14`): `docker compose --profile app up --build` runs the API and the built client in one container on `http://localhost:3002` (root `Dockerfile`, 3 stages on `node:22-alpine`, runs as `node`, 279 MB; `server/scripts/docker-start.sh` downloads the dataset, migrates, seeds when the catalog is empty, starts). In production the server serves `server/public` (page addresses get `index.html`; unknown `/api/*` stays a JSON 404). New optional `COOKIE_SECURE`; the security headers allow `https` photos. Plain `docker compose up -d` still starts only MySQL. Verified: logs, home page, deep link, API, restart skips the seed, `main` retested (server 680, client 589, lint, build, image rebuilds). Not checked: signing in over `http://localhost:3002` in a browser and the Postman Foundation folder against it.
- MVP step 7, Admin (`feature/admin`, merged `14c66aa`): everything under `/api/admin` is guarded once by `requireAdmin`. Products (list, create, edit), variants (add, color, size, exact stock), orders (status changes; cancel gives the stock back once), reviews (list, delete). Lazy `/admin` area (shadcn/ui, TanStack Table v9). A product is hidden or shown with a button, never deleted; colors and sizes have no status (stock 0 shows Sold out). A `401 UNAUTHORIZED` from any request turns the user into a guest. Two `code-reviewer` runs found no Must fix. Not confirmed: the Postman Admin folder and the Admin UI checklist.
- MVP step 6, Reviews (`feature/reviews`, merged `0760a52`): public list, write, edit and delete your own review; only a `delivered` order of the same user and product can review. Postman Reviews folder and Reviews UI checklist not confirmed.
- MVP step 5, Pay and orders (`feature/orders`, merged `a172d79`): mock payment in one transaction, double Pay makes one order, order list and detail. The owner confirmed Pay works. Postman Orders folder and Orders UI checklist not confirmed.
- MVP step 4, Cart (`feature/cart`, merged `3b446ec`): guest bag (50 lines max), signed-in bag, merge after sign in, Bag icon, `/cart`. Postman Cart folder run by the owner; Cart UI checklist not confirmed.

## In progress
- Nothing. `main` has everything merged and passing (server 698, client 589). GitHub has `main` up to `52db6c2`; the README commit (`71087ef`) and the commit that saves these notes are not pushed yet.

## Next steps
1. Push `main` (the owner does this) and check that CI is green. If the README still shows `<ADMIN_PASSWORD>` in the demo logins table, the owner fills it or deletes that row first.
2. The owner runs the Postman Orders, Reviews and Admin folders and the Cart, Orders, Reviews and Admin UI checklists, and signs in at `http://localhost:3002` once with the Docker app (stop `npm run dev` first), and reports problems.
3. Staging smoke test (owner): sign in as the demo customer (also checks secure cookies and `TRUST_PROXY=1`), add to bag, Pay, an order in the list, the admin area, one failure case; then look at the Render logs. Record the result here. Production only after staging passes and with the owner's go-ahead (`deploy-checklist.md`).
4. The merged `feature/*` branches are deleted (only `main` is left); start the next piece of work on a new branch.

## Decisions
See `decisions.md` (not loaded every session). New decisions go there.

## Known issues
- Staging secrets were pasted into a chat once (Aiven database password, `JWT_SECRET`, and weak demo and admin passwords). The owner was told to reset the database password, make a new `JWT_SECRET` and use a strong admin password; confirm it was done.
- Free Render sleeps after 15 minutes (about a minute to wake) and has an ephemeral filesystem; it is for staging and demos only.
- Product images are hotlinked from Shopify's CDN and may disappear one day.
- The Docker app uses the same MySQL and database (`ecommerce_v2`) as `npm run dev`, and both use port 3002, so run one at a time. `docker compose --profile app down -v` deletes the MySQL volume, which includes the dev database (the README says so). In production the server needs a `JWT_SECRET` of at least 32 characters.
- CI does not build the Docker image. It also shows a warning only: `actions/checkout@v4` and `actions/setup-node@v4` run on Node 20, which GitHub is retiring; update them to a newer major when there is one.
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
