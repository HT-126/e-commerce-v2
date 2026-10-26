# Decisions

Settled choices and why, so they are not reopened by mistake. Not loaded every session: read it before planning a feature or changing the stack. To change a decision, ask the user, then edit the line and add the new reason.

Format: `- <decision> (reason: <why>)`. Newest at the bottom. Details live in the file named in the line; do not copy them here.

- Clothing only, 8 flat categories (reason: simpler sizes, menu and data model).
- Knex, not Sequelize (reason: close to SQL, built-in migrations, easy atomic stock update).
- Admin: own pages with React + Tailwind, plus shadcn/ui (JS) and TanStack Table, admin only (reason: faster forms and tables, still our own code and stack; shadcn-admin template rejected because it is TypeScript with another router).
- Stock seeded as 10 or 0, hidden from customers (reason: the dataset has only in stock true/false).
- No color codes (reason: not in the dataset). Size chart, highlights and fit text are parsed from `description_html` in the seed.
- Only buyers can review: needs a `delivered` order for the product (reason: owner's choice; reviews are trustworthy).
- No checkout form: "Pay" on the cart page places the order, mock payment always succeeds, no address stored (reason: keep the demo simple).
- Testing: Claude writes and runs automated tests; the user runs a short Postman check per feature with the collection in `postman/` (reason: learn the API, confirm it works for real).
- Project `e-commerce-v2`, new repo; v1 (`HT-126/e-commerce`) is left untouched. Own container, ports and databases (see `stack.md`) (reason: run both side by side, never overwrite v1).
- Docker: MySQL only while coding (`npm run dev` for fast reload); `/docker-app` adds a one-command full run (profile `app`, container `ecommerce_v2_app`) after the first features (reason: demo and CV without slowing dev).
- Rate limits from v1, improved (values in `business-rules.md`) (reason: v1 had no tests and a different error format).
- Dataset pinned to commit `0ce98ce` (reason: the source repo changes every week).
- Bottoms = source categories Pants, Shorts and Skirts (226 products); Skorts is not imported (reason: the 226 count in `dataset.md` matches only these three).
- Size chart kept only when the first table header starts with `Size`: 2,174 products, not 2,178 (reason: 4 tables are model measurements or a set table, not size charts).
- `@hookform/resolvers` pinned to `^5` (reason: v6 has a peer dependency conflict with `npm install`).
- Client linter is oxlint, the Vite template default (reason: no extra dependency; ESLint would be a new one).
- Flat shipping $6.95 under $97.00, cookie 30 days / 1 day, rate limits as in `business-rules.md` confirmed as final (reason: owner reviewed the defaults).
- Shop filters: Color uses 14 groups (13 base colors and `other`) stored in `variants.color_group`, computed by one function from the dataset color name (reason: 502 raw names are too many to filter on; one column keeps the SQL simple and the index useful).
- Color and Size filters match in-stock variants only (reason: a shopper who picks size M wants something buyable).
- Search lives in the header; the Shop page has Color, Size, Price and Sort instead of a search box (reason: owner's choice). "Clear filters" also clears the search text.
- Header is the rounded white pill of the design and is not sticky (reason: owner's choice after trying a sticky one).
- Home slogans fade in from left to right with a soft-edged `mask-image` gradient (pure CSS, 1.2s ease-out, second one 0.4s later, once, off for reduced motion, hidden before it starts; replaces an earlier hard-edged clip-path wipe) (reason: owner's choice).
- Shop controls Color, Size, Price and Sort have no box, just text and an arrow. They all open the same white panel: Color and Size with checkboxes, Price with radio buttons (one choice), Sort as a plain list with a tick and no checkbox. On a phone the panel is as wide as the filter row (reason: owner's choice; the browser's own list looked wrong).
- Product card: the rating (star, number, review count) is on its own line under the price. The line is always reserved, so cards with and without a rating have the same height (reason: owner's choice).
- Accounts: who is signed in is server data (TanStack Query, `GET /api/auth/me`), not a Zustand copy; the user is loaded from the database on every request and the role is never read from the cookie (reason: a changed role or a deleted user takes effect at once).
- Login and register pages keep the design layout but reword copy that promises features we do not have (wishlist, saved details, returns); no "Forgot password?" link; "Terms" and "Privacy Policy" are plain text until those pages exist (reason: only real features are promised; no dead links).
- `POST /api/cart/quote` is public and also prices variants of hidden products (`is_active = false`), as `sold_out`, with their title, slug, price and image. Someone who guesses variant ids can read them (reason: the catalog is public and a hidden product is not a secret; a signed-in cart must still show a hidden product's title so the shopper can remove it; portfolio project).
- A bag holds at most 50 different lines, the most `quote` and `merge` accept in one request. "Add to bag" adds no 51st line and says "Your bag is full (50 items max). Remove one to add another."; more of a line already in the bag still works. The server does not count lines on `PUT /api/cart/items/:variantId`, so the limit is kept by the browser, for guests and signed-in users. If `/cart` is refused a guest bag with `400` (too many lines or a bad value), it offers "Clear bag" next to "Try again". A merge refused with `400` empties the browser bag (reason: a bag the server will never accept must not trap the shopper; keeps the 50-item request limit simple).
- Only products can be hidden from the shop (button "Hide from shop" / "Show in shop" on the product's admin page; there is no delete). Variants (colors and sizes) have no Active / Inactive status: to take one off sale the admin sets its stock to 0, which the shop shows as Sold out (reason: owner's choice; no database change and no new shop or bag rules).
