# Product Spec: Lumière

## What and who
- Product: an online store for women's clothing (tops, dresses, bottoms, sets, jumpsuits, swimwear, outerwear, activewear).
- Users: shoppers who browse, pick a color and size, buy and review. One admin who manages products, stock, orders and reviews.
- Goal: a portfolio-quality e-commerce app that stays simple. A shopper can find a product, add it to the bag, sign in, place an order with a mock payment and leave a review. The admin can run the store.
- Data: 2,242 clothing products from the dataset (see `dataset.md`).
- Design reference: the Lumière canvas (Home, Product, Login, Register). Exported images live in `design/`. Pages not in it use the same tokens and components.

## MVP (build in this order)
Each feature depends only on the ones above it.

1. **Foundation and data**: Docker MySQL, Knex migrations, dataset import seed, demo customer and admin.
   - Done when: `npm run db:reset` gives 8 categories, 2,242 products (2,174 with a size chart) and 17,022 variants, plus the demo customer, the admin and one delivered demo order.
2. **Catalog**: Home, shop, category and product pages.
   - Home: hero, promises, tabs (New arrivals, Top rated, Under $45), product grid.
   - Shop and category pages: grid with sort, price filter, title search, pages.
   - Product page: photos, color and size chips (sold out shown disabled), quantity, highlights, details, size chart, fit text, "Wear it with", rating summary, reviews, related products.
   - Done when: every product can be reached from its category, and the product page shows real data.
3. **Accounts**: register, sign in, sign out, roles.
   - Done when: a user can register, sign in with "Keep me signed in" on or off, sign out, and sees errors for wrong input. The seeded admin can sign in and sees an "Admin" link.
4. **Cart (guest and signed in)**: add, change quantity, remove, merge on sign in.
   - Done when: a guest adds items, signs in and sees all items once. Sold-out lines can only be removed. Checkout is blocked while a line is not `ok`.
5. **Pay and orders**: a "Pay" button on the cart page (no form), mock payment, confirmation, order history.
   - Done when: an order has correct totals, stock goes down, and two buyers of the last item cannot both succeed.
6. **Reviews**: users who bought the product (order `delivered`) add a rating, or a rating and comment; edit and delete their own.
   - Done when: a buyer can review and the shown rating updates using the formula in `business-rules.md`; a user without a delivered order gets `403 NOT_PURCHASED` and sees no review form.
7. **Admin**: products, variants and stock, orders, reviews.
   - Done when: the admin can create and edit a product, change stock, hide a product, move an order through its statuses (cancel restocks), and delete a review. A customer cannot open any admin page or route.

## Later (not in MVP)
- Wishlist, newsletter, forgot password, guest checkout.
- Image upload in admin (MVP uses image URLs).
- Sales dashboard and charts in admin.
- Discounts, promo codes, returns flow, real payments, emails, idempotency key on orders.

## Pages
| Page | Route | Who | Notes |
|---|---|---|---|
| Home | `/` | all | Tabs change the grid. "Shop all" goes to `/shop`. |
| All products | `/shop` | all | Sort, price filter, search `?q=`. |
| Category | `/shop/:category` | all | Slugs from `dataset.md`. "New in" links to `/shop?sort=newest`. |
| Product | `/products/:slug` | all | Size required before adding to bag. Reviews section at the bottom. |
| Login | `/login` | guest | After sign in, return to the page the user came from. |
| Register | `/register` | guest | |
| Cart | `/cart` | all | Totals and a "Pay $X" button. Guests are sent to sign in first. The button is disabled while a line is not `ok` or a request is running. |
| Order confirmation | `/orders/:orderNumber` | customer | |
| Order history | `/account/orders` | customer | |
| Admin products | `/admin/products` | admin | DataTable: search, category and active filters, sort, pages. |
| Admin product edit | `/admin/products/new`, `/admin/products/:id` | admin | Product form, images (URLs), variants table with stock. |
| Admin orders | `/admin/orders` | admin | Table with status filter. |
| Admin order detail | `/admin/orders/:orderNumber` | admin | Status buttons for allowed changes only. |
| Admin reviews | `/admin/reviews` | admin | Table with delete. |
| Not found | `*` | all | |

`/admin` redirects to `/admin/products`.

Header on every customer page: New in, the 8 categories (Tops, Dresses, Bottoms, Sets, Jumpsuits & Rompers, Swimwear, Outerwear, Activewear; on small screens in a menu), and icons for Search, Account, Bag (with item count). Admins also see an "Admin" link.

## User flows
- **Buy as a returning customer**: Home, category, product, choose color and size, add to bag, cart, press "Pay", confirmation.
- **Buy as a guest**: add to bag, press "Pay", sign in or register, guest cart merges, back to the cart, press "Pay".
- **Sold out while paying**: the user is told which items changed, nothing is charged, the cart shows those lines as `not_enough` or `sold_out`.
- **Review**: buy the product, admin marks the order `delivered`, then on the product page (or from order history) "Write a review", pick stars, optional comment, save. The rating updates.
- **Review test path**: sign in as the demo customer, place an order, sign in as admin, set the order to `shipped` then `delivered`, sign in again as the customer and review.
- **Admin restock**: admin products, open product, change a variant's stock from 0 to 5. The size is buyable on the product page again.

## Data from the design that must be real data, not fixed text
- "Rated 4.7 or higher" on Home must be computed from data, or removed.
- The fit text, material, care, length, closure and season come from the product record.
- Size chart numbers come from `size_chart` (parsed from the dataset). Columns differ per product, so render the headers from the data.
- Color choices are text chips (the data has no color codes).
- Product photos come from the dataset (1 to 8 per product).
- The footer credit "Product data: Women's Fashion Catalog Open Data (MIT license)" stays while this dataset is used.

## Out of scope
- Real payment processing. Never store card numbers.
- Selling outside the US, multiple currencies.
- Sending emails.
