# Lumière

An online store for women's clothing: a shop for customers and an admin area for the owner. Portfolio project (React, Express, Knex, MySQL).

## How to run

Needs Node 20 or newer and Docker.

1. Create the env files and set real values (never commit them):
   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```
   `DB_PASSWORD` in `server/.env` must equal `MYSQL_PASSWORD` in `.env`.
2. Start the database (MySQL on host port 3307):
   ```bash
   docker compose up -d
   ```
3. Install, download the product data and fill the database:
   ```bash
   cd server && npm install
   npm run data:download
   npm run db:reset
   cd ../client && npm install
   ```
4. Run the API and the client in two terminals:
   ```bash
   cd server && npm run dev   # http://localhost:3002
   cd client && npm run dev   # http://localhost:5174
   ```

Tests and checks (run in `server/` and in `client/`): `npm test`, `npm run lint`. The client also has `npm run build`.
The server tests use the separate database `ecommerce_v2_test`.

Product data: Women's Fashion Catalog Open Data (MIT license).
