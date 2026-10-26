# Lumière

[![CI](https://github.com/HT-126/e-commerce-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/HT-126/e-commerce-v2/actions/workflows/ci.yml)

A full-stack online store for women's clothing, with a shop for customers and an admin area for the owner: React, Express and MySQL, with 2,242 real products.

**Live demo: https://e-commerce-v2-2ceg.onrender.com/**

> Free hosting: the first visit may take about a minute to wake up.

Payment is a mock (no real money moves) and the store is a portfolio project, not a real shop.

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/home.png" alt="Home page with the hero, new arrivals and category links"><br><sub>Home</sub></td>
    <td width="50%"><img src="docs/screenshots/shop.png" alt="Shop page with Color, Size, Price and Sort filters and a paged product grid"><br><sub>Shop: filters, sort, paging</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/product.png" alt="Product page with photo gallery, color and size choice, size chart and reviews"><br><sub>Product: colors, sizes, size chart, reviews</sub></td>
    <td width="50%"><img src="docs/screenshots/cart.png" alt="Bag page with three items and an order summary"><br><sub>Bag and checkout summary</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/admin.png" alt="Admin products table with search, category and status filters"><br><sub>Admin: products</sub></td>
  </tr>
</table>

## Features

**Shop**
- 2,242 products in 8 categories, imported from an open dataset (see Data below).
- Filter by color, size and price, sort, search by title from the header, and paging.
- Product page with a photo gallery, color and size choice (only sizes in stock can be bought), fabric and care details, a size chart in inches, customer reviews and related products.
- A bag that works without an account (kept in the browser, up to 50 lines) and is merged into your account when you sign in. Totals are always computed by the server; shipping is free from $97 and a flat $6.95 below that.

**Accounts and orders**
- Register, sign in and sign out. The session is a JWT in an httpOnly cookie, with a "remember me" option. Sign-in and register are rate limited.
- Mock payment in one database transaction: stock is checked and taken together with the order, and pressing Pay twice makes only one order.
- Order history and an order detail page.

**Reviews**
- Anyone can read reviews. Only a customer whose order of that product was delivered can rate (1 to 5 stars) and comment; they can edit or delete their own review. The product's average rating updates with each change.

**Admin** (`/admin`, admin role only; the role is checked in the database on every request)
- Products: list with search and filters, create, edit, and hide from or show in the shop (nothing is deleted).
- Variants: add a color and size, and set the exact stock.
- Orders: change the status (paid, shipped, delivered, or cancelled); cancelling a paid order gives the stock back once.
- Reviews: list and delete.

**Engineering**
- Input validated with Zod on every route; passwords hashed with bcrypt; security headers with helmet; one central error handler and a consistent `{ data }` / `{ error }` response format.
- Money is stored as integer cents. Stock changes use conditional updates and row locks, so two buyers can never take the same last item.
- Automated tests on three layers (unit, API against a real MySQL test database, components), and a CI workflow on GitHub Actions.
- The whole app runs from one Docker image.

## Tech stack

| Part | Tools |
|---|---|
| Client | React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, Zustand, React Hook Form + Zod |
| Admin UI | shadcn/ui (Radix), TanStack Table |
| Server | Node.js, Express 5, Knex, mysql2, Zod, bcrypt, JSON Web Tokens, helmet, express-rate-limit |
| Database | MySQL 8 |
| Tests | Vitest, Supertest, React Testing Library |
| Tooling | Docker and Docker Compose, GitHub Actions, ESLint (server), oxlint (client), Postman collection for manual API checks |
| Hosting (demo) | Render (free Docker web service) and Aiven (free MySQL) |

JavaScript only, no TypeScript.

## Architecture

```mermaid
flowchart LR
  user([Browser]) -->|page and /api requests| app

  subgraph render["Render: one Docker container"]
    app["Express 5<br/>serves the built React app<br/>and the /api routes"]
    app --> mw["helmet, JSON body, cookies,<br/>rate limits, Zod validation, auth"]
    mw --> svc["Controllers and services<br/>(business rules, transactions)"]
  end

  svc -->|Knex, TLS| db[("MySQL 8<br/>Aiven")]
  user -.->|product photos| cdn[("Shopify CDN")]
  data["Open dataset<br/>(Livostyle, MIT)"] -.->|one-time seed| db
```

The browser talks to one origin: Express serves the built client and the API, so the session cookie is same-origin and no CORS is needed. In development, Vite serves the client and proxies `/api` to Express.

## Project structure

```
e-commerce-v2/
├── client/                     # React app (Vite)
│   └── src/
│       ├── pages/              # one folder per page: home, shop, product, cart, orders, auth, admin
│       ├── components/         # shared shop UI (ProductCard, Header, filters, ...)
│       │   ├── admin/          # AdminLayout, DataTable, StatusBadge, ...
│       │   └── ui/             # shadcn/ui files, generated, used by the admin area only
│       ├── services/           # API calls
│       ├── hooks/              # TanStack Query hooks
│       ├── stores/             # Zustand store (the guest bag)
│       └── lib/                # small helpers: money, dates, query string, safe redirect
├── server/
│   ├── src/
│   │   ├── routes/             # URL and middleware wiring only
│   │   ├── controllers/        # read the request, call a service, send the response
│   │   ├── services/           # business rules and Knex queries
│   │   ├── schemas/            # Zod schemas for request input
│   │   ├── middleware/         # auth, require-admin, validate, rate-limit, error-handler
│   │   ├── utils/              # session cookie, order numbers, rating formula, color groups
│   │   └── config/env.js       # reads and checks the environment variables
│   ├── db/
│   │   ├── migrations/         # the schema, as Knex migrations
│   │   └── seeds/              # catalog import, demo customer, admin, demo order
│   ├── scripts/                # data download and the Docker start script
│   └── tests/                  # unit/, api/, db/ (+ fixtures/, helpers/)
├── postman/                    # collection for manual API checks
├── docker/init.sql             # creates the test database when the MySQL volume is new
├── docker-compose.yml          # MySQL (and the whole app with --profile app)
├── Dockerfile                  # builds the client and runs client + API in one image
└── .github/workflows/ci.yml    # CI: lint, tests and build for client and server
```

Each request goes **route → controller → service**. Routes only attach middleware; controllers have no business logic; services hold the rules and the Knex queries and know nothing about `req` or `res`.

## Database

MySQL 8, with the schema built only by Knex migrations.

| Table | Contents |
|---|---|
| `users` | Name, email (unique, lower case), bcrypt hash, role (`customer` or `admin`) |
| `categories` | 8 flat categories with a slug and a menu position |
| `products` | Slug, title, description, price, shown and original rating, details (material, care, fit, ...), size chart (JSON), `is_active` |
| `product_images` | Photo URLs with a position (0 is the main photo) |
| `variants` | One row per color and size: SKU, `color_group` for the filter, `stock` |
| `cart_items` | Signed-in users' bags: one row per user and variant, quantity 1 to 9 |
| `orders` | Order number, status (`paid`, `shipped`, `delivered`, `cancelled`), subtotal, shipping, total, email |
| `order_items` | A copy of what was bought: title, color, size, photo, unit price, quantity |
| `reviews` | One per user and product: rating 1 to 5, optional comment |

- Money is an integer number of cents (`*_cents`), never a float.
- Real foreign keys everywhere. Unique keys: one variant per product, color and size; one cart line per user and variant; one review per user and product. `CHECK` constraints keep `stock >= 0` and `rating` between 1 and 5.
- `order_items` is a snapshot, so an order never changes when a product's price or title changes. If a variant is deleted later, its order lines keep their data.
- `products.rating_avg` and `review_count` are recomputed in the same transaction as every review change. The dataset's own ratings are kept separately and counted in.
- The guest bag is not stored in the database, only the browser's.
- The dataset's 502 raw color names are mapped to 14 color groups by one function and stored in `variants.color_group`, so the color filter is a plain indexed query.

## API design

All routes are under `/api`, with JSON bodies and a session cookie. The full contract (every field, limit and error) is in `.claude/knowledge/api.md`.

| Area | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| Catalog | `GET /api/categories`, `GET /api/filters`, `GET /api/products` (query: `category`, `q`, `color`, `size`, `minPriceCents`, `maxPriceCents`, `sort`, `page`, `limit`), `GET /api/products/:slug`, `GET /api/products/:slug/related` |
| Reviews | `GET /api/products/:slug/reviews`, `GET`, `PUT` and `DELETE /api/products/:slug/reviews/mine` *(sign in; writing needs a delivered order)* |
| Bag | `POST /api/cart/quote` *(public, prices a guest bag)*, `GET /api/cart`, `PUT` and `DELETE /api/cart/items/:variantId`, `POST /api/cart/merge` *(sign in)* |
| Orders *(sign in)* | `POST /api/orders` (pay for the bag), `GET /api/orders`, `GET /api/orders/:orderNumber` |
| Admin *(admin only)* | `/api/admin/products` (list, create, read, update; no delete), `/api/admin/products/:id/variants`, `PATCH /api/admin/variants/:id`, `/api/admin/orders` (list, read, change status), `/api/admin/reviews` (list, delete) |

Conventions:
- Success is `{ "data": ... }`. Failure is `{ "error": { "message", "code", "details" } }`, where `code` is one of a fixed list such as `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `EMAIL_TAKEN`, `STOCK_CHANGED` or `RATE_LIMITED`.
- Status codes: 200, 201, 204, 400 (bad input), 401 (not signed in), 403 (not allowed), 404, 409 (conflict, for example not enough stock), 429.
- Prices and totals are always computed on the server. The browser only sends variant ids and quantities.
- Lists are paged with `page` and `limit`, and the limits are validated, not silently cut.
- Customer routes never return stock numbers. Only admin routes do.
- Every `/api/admin` route is guarded once, in one place, so a new admin route cannot forget the check.

```bash
# Dresses under $50, cheapest first
curl "http://localhost:3002/api/products?category=dresses&maxPriceCents=5000&sort=price_asc"

# Sign in, keep the cookie, read your bag
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"your-demo-password"}' http://localhost:3002/api/auth/login
curl -b cookies.txt http://localhost:3002/api/cart
```

## Demo logins

On the live demo:

| Role | Email | Password |
|---|---|---|
| Customer | `demo@gmail.com` | `123456` |
| Admin | `admin@gmail.com` | `<ADMIN_PASSWORD>` |

The admin area is at `/admin` after signing in as the admin. The live demo is public and anyone can sign in, so please do not enter real personal data.

When you run the project yourself, these accounts are created by the seed from the values in `server/.env` (`DEMO_CUSTOMER_*` and `ADMIN_*`).

## Run locally

Needs Node 20 or newer and Docker.

### 1. Set up (both ways)

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Set real values in both files and never commit them. `DB_PASSWORD` in `server/.env` must equal `MYSQL_PASSWORD` in `.env`. Then start the database (MySQL on host port 3307):

```bash
docker compose up -d
```

### 2a. With Docker (the whole app in one container)

```bash
docker compose --profile app up --build    # open http://localhost:3002
docker compose --profile app down          # stop (keeps the data)
```

- The site and the API are both on **http://localhost:3002**. Stop `npm run dev` first, because it uses the same port.
- The first start downloads the product data (about 30 MB, needs internet), creates the tables and fills an empty database. Later starts skip the download and the seed.
- The container uses the same MySQL database (`ecommerce_v2`) as `npm run dev`, so users, orders and products are shared between the two.
- `docker compose --profile app down -v` also **deletes the MySQL volume**, including the dev database. Use it only to start again from nothing.
- In production the server refuses to start unless `JWT_SECRET` in `server/.env` has at least 32 characters.

### 2b. With npm (development)

```bash
cd server && npm install
npm run data:download      # product data, about 30 MB
npm run db:reset           # create the tables and seed them
cd ../client && npm install
```

Then run the API and the client in two terminals:

```bash
cd server && npm run dev   # http://localhost:3002
cd client && npm run dev   # http://localhost:5174
```

## Common problems

| Problem | Cause and fix |
|---|---|
| `Missing environment variables: ...` and the server does not start | A required name is missing from `server/.env`. Copy `server/.env.example` and fill it in |
| `ECONNREFUSED 127.0.0.1:3307` | MySQL is not running. Start it with `docker compose up -d` and check `docker compose ps` |
| `Port 3002 already in use` | The Docker app and `npm run dev` both use port 3002. Stop one of them |
| The server refuses to start in production | `JWT_SECRET` needs at least 32 characters |
| A new route answers 404 in `npm run dev` | `node --watch` can miss a new file. Stop and start `npm run dev` in `server/` again |
| The shop is empty | The seed did not run. Run `npm run db:reset` in `server/`, or start the Docker app, which seeds an empty database |
| Signed in over `http://localhost:3002` but the session is lost | The cookie is `Secure` in production. `docker-compose.yml` sets `COOKIE_SECURE=false` for the local Docker run; keep that for plain http |
| `Too many attempts` (429) | Rate limit: 10 failed sign-ins per 15 minutes (per IP and per email), 10 registers per hour. Restarting the server clears the counters |
| `npm run db:reset` or `docker compose down -v` deleted my data | Both are meant to start again from nothing. To undo one migration step only, use `npx knex migrate:down` (never `migrate:rollback` with a single batch: it drops every table) |
| Hosted database: connection or certificate error | Set `DB_SSL=true` and put the CA certificate in `DB_SSL_CA` on one line with line breaks written as `\n`, without quotes |
| The live demo is slow on the first visit | Free hosting sleeps after 15 minutes without visits and takes about a minute to wake up |
| Product photos do not load | They are hotlinked from Shopify's CDN (see Data below) |

## Tests

Run these in `server/` and in `client/`:

```bash
npm test         # server: Vitest + Supertest against the test database; client: Vitest + React Testing Library
npm run lint
npm run build    # client only
```

The server tests need the MySQL container running and use a separate database, `ecommerce_v2_test`, which is never the development one. At the time of writing there are 698 server tests and 589 client tests. The Postman collection in `postman/` is for manual API checks (see `postman/README.md`).

## Security notes

- Every route that takes input is validated with Zod, and bad input gets `400` before any service runs.
- The session is a JWT in an `httpOnly`, `SameSite=Lax` cookie (`Secure` over HTTPS). The token holds only the user id, the algorithm is pinned to HS256, and its life matches the cookie (1 day, or 30 days with "remember me").
- The role is never read from the token: the user is loaded from the database on every request, so a deleted user or a changed role takes effect at once.
- Passwords are hashed with bcrypt and never returned or logged. A wrong email and a wrong password give the same message, and an unknown email still runs a bcrypt compare, so the response time does not reveal which accounts exist.
- Rate limits on sign-in (per IP and per email, failed attempts only) and on register. The counters are in memory, per server process. `TRUST_PROXY` is set only behind a real proxy, because trusting `X-Forwarded-For` without one lets anyone fake their IP.
- Every `/api/admin` route is guarded once by `requireAdmin`. A customer gets `403`, and someone signed out gets `401`.
- A customer can only read their own orders (another user's order is `404`). Customer routes never return stock numbers.
- Prices and totals come from the database, never from the browser. Stock changes use a conditional update inside a transaction, so two buyers cannot take the same last item.
- Database queries go through Knex with bound values. A `%` or `_` typed in a search is matched as plain text.
- `helmet` sets security headers with a content security policy. The only loosening is images from any `https` address, because the product photos live on other hosts.
- The client builds no HTML from user text (no `dangerouslySetInnerHTML`), so a `<script>` in a review is shown, not run. The "go back after sign-in" address must be a path on this site.
- Secrets live only in environment variables; `.env` files are never committed. `npm audit` on the production dependencies found no problems before the first deploy.

## Data

Products come from the **Women's Fashion Catalog Open Data** by Livostyle (MIT license): https://github.com/arturayupov/womens-fashion-catalog-open-data. The project pins one version of the file, keeps only the clothing categories (2,242 of its products) and maps them to 8 categories. The dataset has no stock numbers and no sale prices, so the seed gives every in-stock variant 10 units, and prices are taken as they are in USD.

**Product photos are not stored in this repository.** They are hotlinked from Shopify's CDN (and a few from livostyle.com) and could disappear one day, which would leave product cards without a picture.

## Project notes

The decisions made during the build, with their reasons, are in `.claude/knowledge/decisions.md`. Known issues and small polish items are in `.claude/knowledge/progress.md`.
