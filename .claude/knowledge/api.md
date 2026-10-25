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

### `POST /api/auth/register`
- Request: `{ firstName, lastName, email, password, acceptTerms: true }`
- Response `201`: `{ data: { user } }` and sets the session cookie.
- Errors: `400`, `409 EMAIL_TAKEN`, `429`
- Schema: `registerUserSchema`

### `POST /api/auth/login`
- Request: `{ email, password, remember?: boolean }`
- Response `200`: `{ data: { user } }` and sets the session cookie.
- Errors: `400`, `401 INVALID_CREDENTIALS`, `429`
- Schema: `loginUserSchema`

### `POST /api/auth/logout`
- Auth: required. Response `204`. Clears the cookie.

### `GET /api/auth/me`
- Auth: required. Response `200`: `{ data: { user } }`
- `user` = `{ id, firstName, lastName, email, role }`. Never include the password hash.

## Catalog

### `GET /api/categories`
- Response `200`: `{ data: [{ id, name, slug }] }` in menu order.

### `GET /api/products`
- Query (all optional): `category` (slug), `sort` (`newest` | `rating` | `price_asc` | `price_desc`, default `newest`), `maxPriceCents`, `q` (search in title), `page` (default 1), `limit` (default 12, max 48)
- Home tabs: New arrivals = `sort=newest`, Top rated = `sort=rating`, Under $45 = `maxPriceCents=4499`.
- A `limit` above 48 is rejected with `400 VALIDATION_ERROR` (not clamped). An empty `q`, `category` or `maxPriceCents` counts as not sent. An unknown `category` slug gives an empty list.
- Inactive products never appear. `soldOut` is true when no variant has stock; the stock number is never returned.
- Response `200`: `{ data: { items: [productCard], page, limit, total } }`
- `productCard` = `{ id, slug, title, priceCents, ratingAvg, reviewCount, imageUrl, imageAlt, soldOut }`
- Schema: `listProductsSchema` (query)

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

### `GET /api/products/:slug/reviews`
- Query: `page` (default 1), `limit` (default 10, max 50)
- Response `200`: `{ data: { items: [{ id, rating, comment, authorName, createdAt }], page, limit, total } }`
- Only reviews with a comment. `authorName` = first name + last initial ("Anna K.").

### `GET /api/products/:slug/reviews/mine`
- Auth: required. Response `200`: `{ data: { review: review | null, canReview: boolean } }`
- `canReview` is true when the user has a `delivered` order for this product.

### `PUT /api/products/:slug/reviews/mine`
Creates or updates the signed-in user's review.
- Auth: required
- Request: `{ rating: 1-5, comment?: string (max 1000) | null }`
- Rules: the user must have a `delivered` order for this product (`business-rules.md`).
- Response `200`: `{ data: { review, ratingAvg, reviewCount } }`
- Errors: `400`, `401`, `403 NOT_PURCHASED`, `404`
- Schema: `saveReviewSchema`

### `DELETE /api/products/:slug/reviews/mine`
- Auth: required. Response `200`: `{ data: { ratingAvg, reviewCount } }`

## Cart

The guest cart lives in the browser as a list of `{ variantId, quantity }`. The server never trusts client prices.

`cartLine` = `{ variantId, productSlug, title, color, size, imageUrl, unitPriceCents, quantity, lineTotalCents, status }` where `status` is `ok`, `not_enough` or `sold_out`.
`cart` = `{ lines: [cartLine], subtotalCents, shippingCents, totalCents, canCheckout }`. Totals count only `ok` lines. `canCheckout` is true when there is at least one line and every line is `ok`.

### `POST /api/cart/quote`
Prices a guest cart.
- Request: `{ items: [{ variantId, quantity: 1-9 }] }` (up to 50 items)
- Response `200`: `{ data: cart }`. Unknown variants are left out.
- Schema: `quoteCartSchema`

### `GET /api/cart`
- Auth: required. Response `200`: `{ data: cart }`

### `PUT /api/cart/items/:variantId`
Sets the quantity of one line. Creates it if missing.
- Auth: required
- Request: `{ quantity: 1-9 }`
- Response `200`: `{ data: cart }`
- Errors: `400`, `404` (variant not found)
- Schema: `setCartItemSchema`

### `DELETE /api/cart/items/:variantId`
- Auth: required. Response `200`: `{ data: cart }`

### `POST /api/cart/merge`
- Auth: required
- Request: `{ items: [{ variantId, quantity: 1-9 }] }`
- Rules: "Guest cart and merge" in `business-rules.md`.
- Response `200`: `{ data: cart }`
- Schema: `mergeCartSchema`

## Orders

### `POST /api/orders`
Places an order from the signed-in user's cart. Called by the "Pay" button on the cart page. No address or payment form: the mock payment always succeeds.
- Auth: required
- Request: no body
- Server steps (one transaction): read cart, check every line is `ok`, reduce stock (rules in `business-rules.md`), create order and items with status `paid`, empty the cart.
- Response `201`: `{ data: order }`
- Errors: `400 CART_EMPTY`, `400 CART_NOT_READY`, `401`, `409 STOCK_CHANGED` (`details`: `[{ variantId, title, color, size }]`; nothing was changed)
- Schema: none (no input)

### `GET /api/orders`
- Auth: required. Query: `page`, `limit`
- Response `200`: `{ data: { items: [{ orderNumber, status, createdAt, totalCents, itemCount }], page, limit, total } }`, newest first, own orders only.

### `GET /api/orders/:orderNumber`
- Auth: required (owner only; another user's order is `404`)
- Response `200`: `{ data: order }`
- `order` = `{ orderNumber, status, createdAt, items: [{ productSlug, title, color, size, imageUrl, unitPriceCents, quantity, lineTotalCents }], subtotalCents, shippingCents, totalCents }`

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
