# Test Plan: Lumière

What each MVP feature must test. `test-feature` reads the section for the feature in hand and adds its own cases. Rules behind each line are in `business-rules.md`.

Priority: **must** = money, stock, permissions or data loss (never skip); **should** = normal behavior.

## 1. Foundation and data
- Unit (must): size cleaning (`onesize` → `One Size`, `XXL` → `2XL`, others kept), color Title Case, category map, price to cents, `description_html` parsing (hook, highlights, fit text, size chart, missing parts → null). Use `fixtures/products.sample.json` (3–5 products copied from the dataset, including one with no table).
- API (should): `GET /api/health` returns 200.
- Seed (manual, once): `npm run db:reset` prints 8 / 2,242 / 17,022; a second `npm run seed` stops.

## 2. Catalog
- API (should): list with each `sort`, `category`, `maxPriceCents`, `q`, `page` / `limit` (limit max 48); inactive products never appear; product page returns 404 for an inactive slug.
- API (must): no customer route returns a `stock` number.
- Component (should): sold-out size or color chip is disabled; "Add to bag" without a size shows "Please choose a size."
- Filters, unit (must): `colorGroupFor` (plain, multi-word, `A/B` names, unknown, empty), `sortSizes`, query schema (comma lists, limits, min greater than max).
- Filters, API (must): `color` alone, several colors, `size` alone, several sizes; color + size must match the **same** in-stock variant; a sold-out variant never matches; price range edges (min included); `minPriceCents` above `maxPriceCents` gives `400`; filters + sort + category + search + paging together; unknown color or size gives an empty list; `GET /api/filters` lists only options of active products, sizes in order, no `stock`.
- Filters, component (should): picking several colors or sizes updates the URL and the request; a refresh restores the filters; "Clear filters" resets Color, Size, Price and search but keeps category and sort; the empty state offers "Clear filters"; bad values in the URL are ignored.
- Header (should): the search field opens, submits to `/shop?q=` and closes with Escape, a click outside or Tab leaving.
- Product card (should): the rating is on its own line below the price; a card without a rating keeps the line (same height); screen readers hear the rating in words.

## 3. Accounts
- API (must): register (email lower case, duplicate → `409 EMAIL_TAKEN`), login wrong email and wrong password give the same `401`, password hash never returned, `remember` changes cookie length.
- API (must): rate limits as in `business-rules.md`: 11th failed sign in per IP → `429 RATE_LIMITED`; successful sign ins do not count; 11 failed tries on one email from different IPs (`X-Forwarded-For` with `TRUST_PROXY=1` in the test) → `429`; 11th register in an hour → `429`.
- API (must): the session cookie is `HttpOnly`, `SameSite=Lax`, 30 days with `remember` and 1 day without; a tampered or expired token, or a deleted user, gives `401`; the role is read from the database (a user promoted after sign-in is admin at once); a password over 72 bytes, or `acceptTerms: false`, gives `400`; the duplicate-email check ignores case; the limiters are created fresh per app, so tests never leak `429`s into each other.
- Component (should): register form errors under each field; the server errors (wrong credentials, email taken, too many attempts) show in place; Show/Hide password; after sign-in the user goes back to the page they came from; the header Account link or menu (name, Admin link for admins only, Sign out). A failed sign out (server error or no network) keeps the user signed in, keeps the panel open and says so; a 401 on sign out counts as signed out. A "next page" that points to another site (`//host`, `/\\host`, tab or line break tricks) is ignored.

## 4. Cart
- Unit (must): line status (`ok`, `not_enough`, `sold_out`), totals count only `ok` lines, shipping (`>= 9700` free, else `695`), quantity cap 9.
- API (must): merge uses the larger quantity, sending the same items twice changes nothing, unknown variants skipped, sold-out kept as `sold_out`; another user's cart is never touched.
- Component (should): guest cart store (add, change, remove, persist); sold-out line only has "Remove".

## 5. Pay and orders
- API (must): Pay creates a `paid` order with correct totals, reduces stock and empties the cart; empty cart → `400 CART_EMPTY`; a line not `ok` → `400 CART_NOT_READY` and nothing changes; not signed in → `401`.
- API (must): **two parallel orders for a variant with stock 1: exactly one succeeds, the other gets `409 STOCK_CHANGED`, stock ends at 0.**
- API (must): order list and detail show only the user's own orders (another user's → `404`).
- Unit (should): order number format `LM-YYMMDD-NNNN`.

## 6. Reviews
- Unit (must): rating formula mixes seed values and real reviews; null when count is 0; one decimal.
- API (must): no order, or only `paid` / `shipped` → `403 NOT_PURCHASED`; `delivered` order → can review; one review per user per product (second PUT updates); delete recomputes the rating; comment optional, max 1000.

## 7. Admin
- API (must): every `/api/admin/*` route as a customer → `403`, signed out → `401`.
- API (must): order status only through allowed changes (`INVALID_STATUS_CHANGE` otherwise); cancelling restocks in the same transaction; stock edit rejects values below 0.
- API (should): create and edit product, `SLUG_TAKEN`, `SKU_TAKEN`, hide product (it disappears from the shop), delete review recomputes rating, list paging and sort.
- Component (should): product form errors; `DataTable` sends page and sort to the API.
