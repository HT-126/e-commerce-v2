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

## Run with Docker

The whole app (the API and the built client) in one container, as a production-like check or a demo. After the two
env files and `docker compose up -d` are set up as above, no Node install is needed.

```bash
docker compose --profile app up --build    # start; open http://localhost:3002
docker compose --profile app down          # stop (keeps the data)
docker compose --profile app down -v       # stop and DELETE the data: see below
```

- The site and the API are both on **http://localhost:3002**. Stop `npm run dev` in `server/` first: it uses the same port.
- The first start downloads the product data (about 30 MB, needs internet) into a Docker volume and fills an empty
  database. Later starts skip both.
- The container uses the **same MySQL and the same database (`ecommerce_v2`) as `npm run dev`**, so the users, orders and
  products are shared between the two.
- `down -v` deletes this project's Docker volumes: the MySQL data (**including the dev database and its users and
  orders**) and the downloaded product data. Use it only to start again from nothing (then `docker compose up -d` and
  `npm run db:reset` in `server/`, or just start the app again).
- In production the server refuses to start unless `JWT_SECRET` in `server/.env` has at least 32 characters.
- Plain `docker compose up -d` still starts only the database, and `npm run dev` works as before.

Tests and checks (run in `server/` and in `client/`): `npm test`, `npm run lint`. The client also has `npm run build`.
The server tests use the separate database `ecommerce_v2_test`.

Product data: Women's Fashion Catalog Open Data (MIT license).
