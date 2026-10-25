# Data Model: Lumière

Database: MySQL 8 (InnoDB, `utf8mb4`). Schema is built only with Knex migrations. Update this file in the same change as any schema change.

Rules for every table:
- Primary key `id` (`increments()`, int unsigned) unless said otherwise.
- `created_at` and `updated_at` timestamps (`table.timestamps(true, true)`).
- Money is stored as integer cents (`*_cents`). Currency is always USD, so there is no currency column.
- Names are `snake_case`. Table names are plural.
- Foreign keys are real foreign keys.

## Tables (MVP)

### users
| Column | Type | Notes |
|---|---|---|
| first_name | varchar(60) | required |
| last_name | varchar(60) | required |
| email | varchar(255) | required, unique, stored lower case |
| password_hash | varchar(255) | bcrypt hash. Never returned by the API |
| role | enum('customer','admin') | default `customer` |

### categories
Flat list, no parent. Values come from the map in `dataset.md`.
| Column | Type | Notes |
|---|---|---|
| name | varchar(60) | for example Tops |
| slug | varchar(60) | unique, used in URLs |
| position | tinyint unsigned | menu order |

### products
| Column | Type | Notes |
|---|---|---|
| source_id | varchar(20), null | unique. Shopify id from the dataset. Null for products created in admin |
| slug | varchar(160) | unique, used in URLs |
| title | varchar(200) | required |
| description | text, null | short intro (plain text) |
| highlights | json, null | array of short strings |
| styling_note | text, null | "Wear it with" text |
| size_chart | json, null | `{ headers: [string], rows: [[string]] }`, values in inches |
| category_id | int unsigned | references `categories.id` |
| price_cents | int unsigned | one price for all variants |
| seed_rating_avg | decimal(2,1), null | rating from the dataset. Never changes |
| seed_review_count | int unsigned | count from the dataset, default 0. Never changes |
| rating_avg | decimal(2,1), null | shown rating. Recomputed when a review changes (see `business-rules.md`) |
| review_count | int unsigned | shown count, default 0 |
| material | varchar(120), null | |
| care | varchar(255), null | |
| fit | varchar(40), null | for example Relaxed |
| length | varchar(40), null | for example Midi |
| closure | varchar(60), null | for example Pullover |
| season | varchar(40), null | |
| pattern | varchar(60), null | |
| sizing_notes | text, null | "Fit & sizing" text |
| is_active | boolean | default true. Inactive products are hidden from customers |

### product_images
| Column | Type | Notes |
|---|---|---|
| product_id | int unsigned | references `products.id`, delete with the product |
| url | varchar(500) | remote URL |
| alt | varchar(255) | |
| width | smallint unsigned, null | |
| height | smallint unsigned, null | |
| position | tinyint unsigned | 0 is the main photo |

### variants
One row per color and size. Stock lives here.
| Column | Type | Notes |
|---|---|---|
| product_id | int unsigned | references `products.id`, delete with the product |
| sku | varchar(40) | unique |
| color_name | varchar(60) | cleaned name, see `dataset.md` |
| size | varchar(20) | cleaned value, for example `M`, `2XL`, `One Size`, `8`, `16W` |
| position | smallint unsigned | display order inside the product |
| stock | int unsigned | default 0. Add `CHECK (stock >= 0)` |

Unique key: (`product_id`, `color_name`, `size`).

### cart_items
Only for signed-in users. A guest cart is not stored in the database.
| Column | Type | Notes |
|---|---|---|
| user_id | int unsigned | references `users.id`, delete with the user |
| variant_id | int unsigned | references `variants.id`, delete with the variant |
| quantity | tinyint unsigned | 1 to 9 |

Unique key: (`user_id`, `variant_id`). Prices are not stored here.

### orders
| Column | Type | Notes |
|---|---|---|
| order_number | varchar(20) | unique, shown to the user. Format in `business-rules.md` |
| user_id | int unsigned | references `users.id` |
| status | enum('paid','shipped','delivered','cancelled') | see `business-rules.md` |
| subtotal_cents | int unsigned | |
| shipping_cents | int unsigned | |
| total_cents | int unsigned | |
| email | varchar(255) | copy of the email at order time |

### order_items
A snapshot of what was bought. It never changes when the product changes.
| Column | Type | Notes |
|---|---|---|
| order_id | int unsigned | references `orders.id` |
| variant_id | int unsigned, null | references `variants.id`, set null if the variant is deleted |
| product_id | int unsigned | references `products.id`. Used to check "bought" for reviews |
| product_slug | varchar(160) | for the link back |
| title | varchar(200) | |
| color_name | varchar(60) | |
| size | varchar(20) | |
| image_url | varchar(500) | |
| unit_price_cents | int unsigned | |
| quantity | tinyint unsigned | |
| line_total_cents | int unsigned | `unit_price_cents * quantity` |

### reviews
| Column | Type | Notes |
|---|---|---|
| product_id | int unsigned | references `products.id`, delete with the product |
| user_id | int unsigned | references `users.id`, delete with the user |
| rating | tinyint unsigned | 1 to 5. Add `CHECK (rating BETWEEN 1 AND 5)` |
| comment | text, null | optional. Null means rating only |

Unique key: (`product_id`, `user_id`).

## Later (not in MVP)
- `wishlist_items` (`user_id`, `product_id`), primary key on both.
- `newsletter_subscribers` (`email` unique).
- `idempotency_key` on `orders`, if double orders become a problem.

## Relations
- A category has many products.
- A product has many images, variants and reviews.
- A user has many cart items, orders and reviews. A cart item points to one variant.
- An order has many order items.

## Indexes
- `products`: (`category_id`, `is_active`), (`price_cents`), (`created_at`), (`rating_avg`).
- `variants`: (`product_id`).
- `order_items`: (`order_id`), (`product_id`).
- `orders`: (`user_id`, `created_at`), (`status`).
- `reviews`: (`product_id`, `created_at`).

## Seed data
- Catalog: from `dataset.md` (2,242 products, 17,022 variants).
- One `delivered` demo order for the demo customer (see `dataset.md`).
- Users: one demo customer and one admin. Emails and passwords come from `.env`, never real data.
