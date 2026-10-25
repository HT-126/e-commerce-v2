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

## 3. Accounts
- API (must): register (email lower case, duplicate → `409 EMAIL_TAKEN`), login wrong email and wrong password give the same `401`, password hash never returned, `remember` changes cookie length.
- API (must): rate limits as in `business-rules.md`: 11th failed sign in per IP → `429 RATE_LIMITED`; successful sign ins do not count; 11 failed tries on one email from different IPs (`X-Forwarded-For` with `TRUST_PROXY=1` in the test) → `429`; 11th register in an hour → `429`.
- Component (should): register form errors.

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
