# API Contract: Lumière

Write or change the contract here before coding the endpoint. Frontend and backend both follow it.

Base path: `/api`. All bodies are JSON. Auth is a JWT in an httpOnly cookie.
Success: `{ "data": ... }`
Failure: `{ "error": { "message": "...", "code": "...", "details": [] } }` (`code` and `details` are optional)

Money is always integer cents. Dates are ISO 8601 strings. Customer routes never return stock numbers.

## Error codes
| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input failed the Zod schema. `details` holds the issues |
| 400 | `CART_NOT_READY` | Checkout with a cart line that is not `ok` |
| 400 | `CART_EMPTY` | Checkout with an empty cart |
| 400 | `INVALID_STATUS_CHANGE` | Order status change not allowed |
| 401 | `UNAUTHORIZED` | Not signed in |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (same message for both) |
| 403 | `FORBIDDEN` | Signed in but not allowed (for example a customer on an admin route) |
| 403 | `NOT_PURCHASED` | Review a product without a `delivered` order for it |
| 404 | `NOT_FOUND` | |
| 409 | `EMAIL_TAKEN` | Register with an email that exists |
| 409 | `SLUG_TAKEN` | Admin creates or renames a product to a slug that exists |
| 409 | `SKU_TAKEN` | Admin creates a variant with a SKU that exists |
| 409 | `STOCK_CHANGED` | Not enough stock at order time. `details` lists the lines |
| 429 | `RATE_LIMITED` | Too many requests. Limits are in `business-rules.md` (Accounts). Response has `RateLimit` headers |

## Auth

### Session cookie
Register and login set the cookie `token` (a JWT that holds only the user id): `httpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production. It lasts 30 days with `remember: true`, else 1 day, and the JWT expires with it. Every route marked "Auth: required" checks the token, then loads the user from the database (the role is never taken from the token). A missing, invalid or expired token, or a user that no longer exists, gives `401 UNAUTHORIZED`.

### `POST /api/auth/register`
- Request: `{ firstName, lastName, email, password, acceptTerms: true }`
- `firstName`, `lastName`: trimmed, 1 to 60 characters. `email`: trimmed, lower-cased, valid, up to 255. `password`: 8 to 72 bytes (bcrypt ignores the rest, so a longer one is rejected, not cut). `acceptTerms` must be `true`.
- Response `201`: `{ data: { user } }` and sets the session cookie (1 day). The role is always `customer`.
- Errors: `400`, `409 EMAIL_TAKEN`, `429`
- Schema: `registerUserSchema`

### `POST /api/auth/login`
- Request: `{ email, password, remember?: boolean }`
- `email` is trimmed and lower-cased. `remember` defaults to `false`.
- Response `200`: `{ data: { user } }` and sets the session cookie (30 days with `remember`, else 1 day).
- A wrong email and a wrong password give the same `401 INVALID_CREDENTIALS` with the same message.
- Errors: `400`, `401 INVALID_CREDENTIALS`, `429`
- Schema: `loginUserSchema`

### `POST /api/auth/logout`
- Auth: required. Response `204`. Clears the cookie.
- Errors: `401`

### `GET /api/auth/me`
- Auth: required. Response `200`: `{ data: { user } }`
- `user` = `{ id, firstName, lastName, email, role }`. Never include the password hash.
- Errors: `401`

## Catalog

### `GET /api/categories`
- Response `200`: `{ data: [{ id, name, slug }] }` in menu order.

### `GET /api/products`
- Query (all optional): `category` (slug), `sort` (`newest` | `rating` | `price_asc` | `price_desc`, default `newest`), `minPriceCents`, `maxPriceCents`, `q` (search in title), `color`, `size`, `page` (default 1, max 10000), `limit` (default 12, max 48)
- `color` is a comma list of color group keys (`black,white`; keys come from `GET /api/filters`). `size` is a comma list (`M,L`). Up to 15 colors and 20 sizes, each up to 20 characters; values are trimmed and duplicates removed. Unknown values match nothing (empty list).
- Variant filters: a product matches only when it has **one in-stock variant** whose color group is in `color` AND whose size is in `size` (each condition only if sent, both on the same variant). Without `color` and `size`, sold-out products still appear.
- Price: `minPriceCents <= price <= maxPriceCents`. `minPriceCents` greater than `maxPriceCents` is rejected with `400 VALIDATION_ERROR`.
- All filters combine with `category`, `q`, `sort` and paging.
- Home tabs: New arrivals = `sort=newest`, Top rated = `sort=rating`, Under $45 = `maxPriceCents=4499`.
- A `limit` above 48 is rejected with `400 VALIDATION_ERROR` (not clamped). An empty `q`, `category`, `color`, `size`, `minPriceCents` or `maxPriceCents` counts as not sent. An unknown `category` slug gives an empty list.
- Inactive products never appear. `soldOut` is true when no variant has stock; the stock number is never returned.
- Response `200`: `{ data: { items: [productCard], page, limit, total } }`
- `productCard` = `{ id, slug, title, priceCents, ratingAvg, reviewCount, imageUrl, imageAlt, soldOut }`
- Schema: `listProductsSchema` (query)

### `GET /api/filters`
Options for the shop filters.
- Response `200`: `{ data: { colors: [{ key, label }], sizes: [string] } }`
- `colors`: color groups (see `dataset.md`) that exist on at least one active product, in group order. `sizes`: sizes that exist on active products, in a fixed order (XS, S, M, L, XL, 2XL, 3XL ..., One Size, then number sizes).
- No stock numbers. Never fails for lack of data (empty lists).

### `GET /api/products/:slug`
- Response `200`: `{ data: product }`
- `product` = `{ id, slug, title, description, category: { name, slug }, priceCents, ratingAvg, reviewCount, material, care, fit, length, closure, season, pattern, sizingNotes, highlights: [string], stylingNote, sizeChart: { headers: [string], rows: [[string]] } | null, images: [{ url, alt, width, height }], colors: [string], sizes: [string], variants: [{ id, color, size, inStock }] }`
- `colors` and `sizes` are in display order (from `variants.position`). The UI uses `variants` to know which pairs are sold out.
- Errors: `404` (also for inactive products)
- Schema: `getProductSchema` (params)

### `GET /api/products/:slug/related`
- Response `200`: `{ data: [productCard] }` (up to 4, same category, active, not the same product, newest first)
- Errors: `404` (unknown or inactive slug)
- Schema: `getProductSchema` (params)

## Reviews

`review` = `{ rating, comment, createdAt }` (`comment` is `null` for a rating only). The shown `ratingAvg` and `reviewCount` follow the formula in `business-rules.md` and are recomputed in the same transaction as every create, update and delete.

### `GET /api/products/:slug/reviews`
- Query: `page` (default 1, max 10000), `limit` (default 10, max 50)
- Response `200`: `{ data: { items: [{ id, rating, comment, authorName, createdAt }], page, limit, total } }`, newest first.
- Only reviews with a comment, so `total` counts those (not the shown `reviewCount`). `authorName` = first name + last initial ("Anna K.").
- Errors: `400`, `404` (unknown or inactive product)
- Schema: `getProductSchema` (params), `listReviewsSchema` (query)

### `GET /api/products/:slug/reviews/mine`
- Auth: required. Response `200`: `{ data: { review: review | null, canReview: boolean } }`
- `canReview` is true when the user has a `delivered` order for this product.
- Errors: `401`, `404`
- Schema: `getProductSchema` (params)

### `PUT /api/products/:slug/reviews/mine`
Creates or updates the signed-in user's review (one per user per product).
- Auth: required
- Request: `{ rating: 1-5 (whole number), comment?: string (max 1000) | null }`. The comment is trimmed; an empty one is saved as `null`.
- Rules: the user must have a `delivered` order for this product (`business-rules.md`), checked on every create and every update.
- Response `200`: `{ data: { review, ratingAvg, reviewCount } }`
- Errors: `400`, `401`, `403 NOT_PURCHASED`, `404`
- Schema: `getProductSchema` (params), `saveReviewSchema` (body)

### `DELETE /api/products/:slug/reviews/mine`
- Auth: required. Needs no purchase. Response `200`: `{ data: { ratingAvg, reviewCount } }`, also when the user has no review (nothing changes).
- Errors: `401`, `404` (unknown or inactive product)
- Schema: `getProductSchema` (params)

## Cart

The guest cart lives in the browser as a list of `{ variantId, quantity }`. The server never trusts client prices.

`cartLine` = `{ variantId, productSlug, title, color, size, imageUrl, unitPriceCents, quantity, lineTotalCents, status }` where `status` is `ok`, `not_enough` or `sold_out`. `lineTotalCents` is `unitPriceCents * quantity` for every line, whatever its status. Stock numbers are never returned.
`cart` = `{ lines: [cartLine], subtotalCents, shippingCents, totalCents, canCheckout }`. Totals count only `ok` lines. Shipping is `0` when no line is `ok`. `canCheckout` is true when there is at least one line and every line is `ok`.

Lines come back in the order sent (quote) or the order they were added (account cart). Unknown variants are left out. A variant of an inactive product stays in the cart as `sold_out`. The same `variantId` twice in one request is collapsed to the larger quantity.

### `POST /api/cart/quote`
Prices a guest cart. Public (no sign in).
- Request: `{ items: [{ variantId, quantity: 1-9 }] }` (0 to 50 items)
- Response `200`: `{ data: cart }`
- Errors: `400`
- Schema: `quoteCartSchema`

### `GET /api/cart`
- Auth: required. Response `200`: `{ data: cart }`
- Errors: `401`

### `PUT /api/cart/items/:variantId`
Sets the quantity of one line. Creates it if missing.
- Auth: required
- Request: `{ quantity: 1-9 }`
- Response `200`: `{ data: cart }`
- Errors: `400`, `401`, `404` (variant not found, or its product is inactive)
- Schema: `setCartItemSchema` (body), `cartItemParamsSchema` (params)

### `DELETE /api/cart/items/:variantId`
- Auth: required. Response `200`: `{ data: cart }`, also when the line was not in the cart.
- Errors: `400`, `401`
- Schema: `cartItemParamsSchema` (params)

### `POST /api/cart/merge`
- Auth: required
- Request: `{ items: [{ variantId, quantity: 1-9 }] }` (0 to 50 items)
- Rules: "Guest cart and merge" in `business-rules.md`.
- Response `200`: `{ data: cart }`
- Errors: `400`, `401`
- Schema: `mergeCartSchema`

## Orders

`order` = `{ orderNumber, status, createdAt, items: [{ productSlug, title, color, size, imageUrl, unitPriceCents, quantity, lineTotalCents }], subtotalCents, shippingCents, totalCents }`. The items are a copy taken when the order was placed: they never change when the product changes.

### `POST /api/orders`
Places an order from the signed-in user's cart. Called by the "Pay" button on the cart page. No address or payment form: the mock payment always succeeds.
- Auth: required
- Request: no body
- Server steps (one transaction): lock the user's cart rows, read the cart, check every line is `ok`, reduce stock (rules in `business-rules.md`), create order and items with status `paid`, empty the cart.
- The cart rows are locked first, so two Pay requests from the same user at once cannot both use the same cart: the second one finds it empty and gets `400 CART_EMPTY`.
- Response `201`: `{ data: order }`
- Errors: `400 CART_EMPTY`, `400 CART_NOT_READY`, `401`, `409 STOCK_CHANGED` (`details`: `[{ variantId, title, color, size }]` for every line that could not be taken; nothing was changed)
- Schema: none (no input)

### `GET /api/orders`
- Auth: required. Query: `page` (default 1, max 10000), `limit` (default 10, max 50)
- Response `200`: `{ data: { items: [{ orderNumber, status, createdAt, totalCents, itemCount }], page, limit, total } }`, newest first, own orders only. `itemCount` is the total units (the sum of the quantities).
- Errors: `400`, `401`
- Schema: `listOrdersSchema` (query)

### `GET /api/orders/:orderNumber`
- Auth: required (owner only; another user's order, or an unknown number, is `404`)
- Response `200`: `{ data: order }`
- Errors: `400`, `401`, `404`
- Schema: `getOrderSchema` (params)

## Admin
Every route here needs `role = 'admin'`. Others get `401` or `403 FORBIDDEN`. Admin routes may return stock numbers.

### Products
- `GET /api/admin/products` — Query: `q`, `category`, `active` (`true`|`false`), `sort` (`newest` | `title` | `price_asc` | `price_desc`, default `newest`), `page`, `limit` (default 20, max 100). Response: `{ data: { items: [{ id, slug, title, category, priceCents, isActive, variantCount, totalStock, imageUrl }], page, limit, total } }`. Schema: `adminListProductsSchema`
- `GET /api/admin/products/:id` — full product with `images` and `variants: [{ id, sku, color, size, position, stock }]`
- `POST /api/admin/products` — Request: `{ title, slug, description?, highlights?, stylingNote?, categoryId, priceCents, isActive, material?, care?, fit?, length?, closure?, season?, pattern?, sizingNotes?, images: [{ url, alt }] }` (size chart is not editable in the MVP) (at least 1 image). Response `201`. Errors: `400`, `409 SLUG_TAKEN`. Schema: `createProductSchema`
- `PATCH /api/admin/products/:id` — same fields, all optional. `images`, when sent, replaces the whole list. Errors: `400`, `404`, `409 SLUG_TAKEN`. Schema: `updateProductSchema`
- There is no DELETE. Set `isActive: false` instead.

### Variants
- `POST /api/admin/products/:id/variants` — Request: `{ sku, color, size, stock }`. Response `201`. Errors: `400`, `409 SKU_TAKEN`, `409` on duplicate color and size. Schema: `createVariantSchema`
- `PATCH /api/admin/variants/:id` — Request: `{ stock?, color?, size? }` (`stock` is an integer 0 or more). Schema: `updateVariantSchema`

### Orders
- `GET /api/admin/orders` — Query: `status`, `q` (order number or email), `sort` (`newest` | `oldest` | `total_desc`, default `newest`), `page`, `limit` (default 20, max 100). Response: `{ data: { items: [{ orderNumber, status, createdAt, email, totalCents, itemCount }], page, limit, total } }`
- `GET /api/admin/orders/:orderNumber` — the order plus `email` and `customer: { id, firstName, lastName }`
- `PATCH /api/admin/orders/:orderNumber` — Request: `{ status }`. Allowed changes are in `business-rules.md`. Cancelling restocks in the same transaction. Errors: `400 INVALID_STATUS_CHANGE`, `404`. Schema: `updateOrderStatusSchema`

### Reviews
- `GET /api/admin/reviews` — Query: `productId`, `page`, `limit`. Response: list with `{ id, rating, comment, createdAt, product: { slug, title }, user: { email } }`
- `DELETE /api/admin/reviews/:id` — Response `204`. Recomputes the product rating.

## Later
- `GET/PUT/DELETE /api/wishlist`
- `POST /api/newsletter` with `{ email }` (always return success).
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.
- `Idempotency-Key` header on `POST /api/orders`.
