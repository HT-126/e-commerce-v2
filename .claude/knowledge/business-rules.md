# Business Rules: Lumière

Exact rules for money, stock, reviews and status. Code must follow these. Do not invent numbers. The owner has confirmed all values.

## Money
- Currency: USD. Stored as integer cents. Shown as `$12.34`.
- The server calculates every price and total. Never trust a price sent by the browser.
- Order of calculation: subtotal, then shipping, then total. No discounts in the MVP.

## Pricing
- One price per product. All colors and sizes of a product have the same price (true for the whole dataset).
- Quantity per cart line: 1 to 9.

## Shipping
- No shipping address is collected. This is a demo store: no real delivery.
- Free shipping when the subtotal is `>= 9700` cents ($97.00).
- Below that: flat `695` cents ($6.95).
- A cart with no `ok` line (empty, or only sold-out lines) has shipping `0`.

## Returns
- "7-day returns" is shown as text only. There is no return flow.

## Product page
- The first color with any size in stock is selected by default.
- A size must be chosen before "Add to bag". If not, show "Please choose a size." and do not add.
- A color or size with no stock is shown disabled as "Sold out". It is never hidden.
- If every variant is sold out, the product still shows, with a disabled "Sold out" button.
- Customers never see stock numbers. No "Only N left" label.
- Fit text comes from `sizing_notes`, `fit` and `length`.
- Size chart: shown as a table ("Measurements in inches") when `size_chart` is not null. Otherwise show only the fit text.

## Inventory (stock)
Stock is counted per variant. Seed values: 10 if the dataset says in stock, 0 if not (see `dataset.md`).

1. A cart does not reserve stock. Adding to the bag does not change stock.
2. Stock is checked and reduced only when the order is placed, in one database transaction.
3. The reduce step must be atomic. Use a conditional update, not "read, then write":
   ```js
   const changed = await trx('variants')
     .where({ id: variantId })
     .andWhere('stock', '>=', qty)
     .decrement('stock', qty);
   // changed === 0 means not enough stock
   ```
4. Two buyers of the last item press pay at the same time: the database lets one update succeed. The other gets `409 STOCK_CHANGED`, the transaction rolls back, no order is created.
5. An order with several lines is all or nothing. If any line fails, roll back everything.
6. Update the lines in a fixed order (by `variant_id`, lowest first), so two orders cannot block each other.
7. Stock never goes below 0. `CHECK (stock >= 0)` is a second safety net.
8. When an admin cancels an order, add the quantities back to stock, in the same transaction as the status change.
9. Required test: two order requests in parallel for a variant with stock 1. Exactly one succeeds, the other gets `409`, and stock ends at 0.
10. Only admins can see or change stock numbers. The admin sets an exact number (0 or more).

## Cart
- A cart line has a status, computed by the server each time the cart is read:
  - `ok`: the variant has at least the requested quantity.
  - `not_enough`: in stock, but less than the requested quantity. Show "Not enough stock for this quantity. Please lower it." Do not show the number.
  - `sold_out`: stock is 0, or the product is inactive. The line shows disabled. The only action is "Remove".
- Checkout is blocked while any line is not `ok`.

## Guest cart and merge
Guest cart:
- The cart lives only in the browser (Zustand `persist`), as a list of `{ variantId, quantity }`.
- Titles, prices and status are read from the server with `POST /api/cart/quote`.
- A guest can fill the bag. Checkout needs an account.

Merge when the user signs in or registers:
1. The browser sends the guest items to `POST /api/cart/merge` once, right after sign in or register succeeds.
2. Same variant already in the account cart: keep the larger quantity (not the sum), capped at 9.
3. New variant: add it, capped at 9.
4. Variant that no longer exists: skip it.
5. Sold-out variants are kept. They show as `sold_out` in the cart.
6. Sending the same items again changes nothing (because of rule 2), so a retry cannot double the quantities.
7. After a successful merge, empty the browser cart. If the request fails, keep the browser cart and try again on the next page load.
8. On sign out, clear the browser cart. The account cart stays on the server.

## Accounts
- Email is unique, not case sensitive (store lower case).
- Password: 8 to 72 bytes (bcrypt reads only the first 72, so a longer password is rejected instead of silently cut).
- The terms checkbox must be ticked to register.
- "Keep me signed in": cookie lasts 30 days. Without it: 1 day.
- Wrong email and wrong password give the same message, and take the same time (an unknown email still runs a password compare), so nobody can find out which emails have an account.
- Who is signed in is checked against the database on every request. The role comes from the database, never from the cookie.
- Rate limits (per server process, memory store):
  - Sign in, per IP: 10 **failed** tries per 15 minutes. A successful sign in does not count.
  - Sign in, per email: 10 failed tries per 15 minutes for the same email (trimmed, lower case), from any IP.
  - Register, per IP: 10 requests per hour. Every request counts.
  - Over the limit: `429 RATE_LIMITED` with the message "Too many attempts. Try again later." and the `RateLimit` headers. Nothing else is done for that request.
  - Required tests: the 11th failed sign in from one IP gets `429`; successful sign ins never trigger it; 11 failed tries on one email from different IPs get `429`; the 11th register in an hour gets `429`.
- Roles: `customer` (default on register) and `admin`. There is no way to become admin from the app. The admin user is created by the seed.

## Orders
- Payment is mocked. There is no checkout form: pressing "Pay" on the cart page places the order, and it always succeeds unless stock is short or the cart is not ready. A new order starts as `paid`.
- Statuses: `paid`, `shipped`, `delivered`, `cancelled`.
- Allowed changes (admin only): `paid` to `shipped`; `shipped` to `delivered`; `paid` to `cancelled` (restock). No other changes.
- An order keeps a copy of the title, color, size, image, unit price, quantity and the user's email.
- A customer sees only their own orders.
- Order number: `LM-` + date `YYMMDD` + `-` + 4 random digits, for example `LM-261025-4821`. Retry if it already exists.
- Double click on "Pay": the button is disabled while the request runs. (A server-side idempotency key is "later".)
- Never collect or store card data.

## Ratings and reviews
- Only buyers can review. A user may review a product only if they have an order for it that is `delivered`. Orders that are `paid`, `shipped` or `cancelled` do not count.
- "Bought" is checked on the server with `order_items.product_id`, on every create and update. Never trust the browser.
- A `delivered` order cannot be cancelled, so a review never loses the order behind it.
- Required test: a user with no order, and a user with only a `paid` or `shipped` order, both get `403 NOT_PURCHASED`; a user with a `delivered` order can review.
- The product page shows "Write a review" only when the user can review. Otherwise it shows "Only customers who bought this item can review it."
- One review per user per product. The user can edit or delete their own review.
- A review is a rating 1 to 5, with an optional comment (max 1000 characters). Rating only is allowed.
- The product page lists reviews that have a comment, newest first. Rating-only reviews count in the average only.
- Shown rating mixes the dataset value and real reviews:
  - `review_count = seed_review_count + count(reviews)`
  - `rating_avg = (seed_rating_avg * seed_review_count + sum(reviews.rating)) / review_count`, rounded to one decimal. Null when `review_count` is 0.
  - Recompute both in the same transaction as every review create, update or delete.
- Admin can delete any review (for spam).

## Catalog and filters
- Shop filters: Color (several color groups), Size (several sizes) and Price (one range). They combine with each other, with the category, the search text and the sort.
- Color and Size match **in-stock variants only**: a product shows when one of its variants has stock, is in a chosen color group and has a chosen size (both on the same variant). With neither filter, sold-out products still show, as sold out.
- Price ranges: Under $25, $25-$50, $50-$75, $75-$100, $100+. The lower limit is included, the upper limit is not (`$25-$50` = 2500 to 4999 cents).
- "Clear filters" resets Color, Size, Price and the search text. The category and the sort stay.
- Filters live in the URL, so a refresh or a shared link shows the same list. Changing a filter goes back to page 1.
- Inactive products (`is_active = false`) never appear on customer pages or in carts as buyable.
- Home tabs: New arrivals = newest `created_at` first. Top rated = highest `rating_avg` first, then higher `review_count`, products with no rating last. Under $45 = `price_cents < 4500`.
- Any claim on Home like "Rated 4.7 or higher" must be computed from data, or removed.

## Admin
- Only `role = 'admin'` can open `/admin` pages and `/api/admin/*` routes. Others get `403` (API) or are sent to Home (UI).
- Admin can: list, create and edit products (title, description, category, price, active, image URLs, details); add or edit variants and their stock; list orders and change status; list and delete reviews.
- "Delete product" means set `is_active = false`. Products are never removed, because old orders point to them.
- Image upload is not in the MVP. The admin enters image URLs.

## Content and licensing
- Product data comes from the Women's Fashion Catalog Open Data (MIT license). Keep the credit in the footer.
- Do not copy text or images from other stores.
