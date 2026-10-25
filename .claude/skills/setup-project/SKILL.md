---
name: setup-project
description: Use once, after plan-project, to build the project foundation (Docker MySQL, Express + Knex server, React + Tailwind client, lint, tests, CI) and prove it works end to end before any feature.
disable-model-invocation: true
---

# Set up the project foundation

Build only the foundation. No feature code. Work on `main`. The packages below are the approved default stack from `stack.md`; ask before adding anything else.

## 0. Check
- Read `CLAUDE.md`, `stack.md`, `ui-design.md`, `data-model.md`, `dataset.md`, and MVP step 1 in `product-spec.md`.
- Check tools: `node -v` (20 or newer), `npm -v`, `docker compose version`, `git --version`. If one is missing, stop and tell the user.
- If `client/` or `server/` already has code, stop and ask. This skill is for an empty project.
- Show the user the plan (the steps below, one line each) and wait for OK.

## 1. Repository
- `git init` if needed. Merge `.gitignore.snippet` into `.gitignore`.
- Root `README.md`: project name, one sentence, "How to run" (filled at the end).

## 2. Database (Docker)
- `docker-compose.yml`: service `mysql` (`mysql:8.0`), container `ecommerce_v2_mysql`, port `3307:3306` (host 3307, so it never clashes with v1 on 3306), a named volume, a healthcheck, password from `.env` at the root.
- `docker/init.sql`: create the dev and test databases (`ecommerce_v2`, `ecommerce_v2_test`) and give the app user rights on both.
- Root `.env.example` with `MYSQL_ROOT_PASSWORD`. Ask the user to run `cp .env.example .env` and set real values. Never create or read `.env` yourself.
- Ask the user to run `docker compose up -d`, then check it is healthy with `docker compose ps`.

## 3. Server
In `server/`:
- `npm init -y`, set `"type": "module"`.
- Dependencies: `express`, `knex`, `mysql2`, `zod`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, `express-rate-limit`, `helmet`, `dotenv`.
- Dev dependencies: `vitest`, `supertest`, `eslint`, `@eslint/js`, `globals`, `prettier`.
- Files:
  - `src/config/env.js`: loads `.env`, checks every required variable, stops with a clear message if one is missing.
  - `src/db/knex.js` and `knexfile.js` (dev and test; migrations in `db/migrations`, seeds in `db/seeds`).
  - `src/utils/app-error.js`, `src/middleware/error-handler.js`, `src/middleware/validate.js` (pattern in `backend.md`), `src/middleware/require-auth.js` (stub that returns 401 until auth is built).
  - `src/routes/health.routes.js`: `GET /api/health` runs `select 1` and returns `{ data: { status: 'ok', db: 'ok' } }`.
  - `src/middleware/rate-limit.js` with the limiters from `backend.md` (wired to auth routes when they are built).
  - `src/app.js` (builds the app: `trust proxy` from `TRUST_PROXY`, `helmet`, JSON body, cookie parser, routes, 404 handler, error handler; no `listen`) and `src/server.js` (imports app, listens on `PORT`).
- `server/.env.example` with every variable from `stack.md`, with v2 defaults: `PORT=3002`, `DB_PORT=3307`, `DB_NAME=ecommerce_v2`, `DB_NAME_TEST=ecommerce_v2_test`. Ask the user to copy it to `server/.env` and fill it.
- Scripts: `dev` (`node --watch src/server.js`), `start`, `test` (`vitest run`), `migrate`, `migrate:rollback`, `seed`, `db:reset`, `lint`, `format`. Also `data:download`: downloads the pinned `products.json` from `dataset.md` to `db/data/` (skip if the file exists). Seed dependency (in `dependencies`, needed later by the Docker image): `node-html-parser`.

## 4. Migrations and dataset seed (MVP step 1)
- Migrations for every MVP table in `data-model.md`, one file per table, in foreign-key order. Include the `CHECK` rules.
- Seed exactly as in `dataset.md`: filter, category map, field mapping, cleaning, `description_html` parsing, stock 10 or 0, the stock-1 test variant, demo customer, admin, and the delivered demo order.
- The seed stops if `products` already has rows: it prints "Seed skipped: database not empty" and exits with code 0 (not an error), so `/docker-app` can run it on every start. On a real run it prints the counts at the end.

## 5. Client
- From the root: `npm create vite@latest client -- --template react` (never `react-ts`).
- Dependencies: `react-router`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `tailwindcss`, `@tailwindcss/vite`.
- Dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `prettier` (ESLint comes with the Vite template).
- `vite.config.js`: React and Tailwind plugins, `server.port: 5174` with `strictPort: true`, `server.proxy` `/api` to `http://localhost:3002`, Vitest `environment: 'jsdom'`.
- `src/index.css`: the tokens from `ui-design.md`. Fonts in `index.html`.
- `src/lib/api.js`: small `fetch` wrapper (relative URL, `credentials: 'include'`, JSON, throws an error with `status`, `code`, `message` from the error format).
- `src/main.jsx`: `QueryClientProvider` and the router. `src/components/Layout.jsx` (header, main, footer), `src/pages/home/HomePage.jsx` (shows the `/api/health` result with loading and error states), `src/pages/NotFoundPage.jsx`.
- Delete the Vite demo files (counter, logos, `App.css`).
- shadcn/ui is for admin pages only: do not set it up now. Do it at the start of the Admin feature ("shadcn/ui setup" in `stack.md`).
- Scripts: `dev`, `build`, `preview`, `test` (`vitest run`), `lint`, `format`.

## 6. Lint, format, tests
- ESLint flat config in `server/` (Node globals) and `client/` (from the template). Prettier config at the root, shared.
- `server/vitest.config.js`: `fileParallelism: false`, `globalSetup` that runs migrations on the test database.
- `server/tests/health.test.js`: `GET /api/health` returns 200 and `{ data: { status: 'ok' } }`.
- `client/src/pages/home/HomePage.test.jsx`: renders loading, then the status (mock `fetch`).

## 7. Postman
- Check that `postman/lumiere.postman_collection.json` has the "Foundation" folder with `GET /api/health`, and `postman/local.postman_environment.json` has `baseUrl` = `http://localhost:3002`. Parse both files as JSON.

## 8. CI
- Copy `.claude/templates/ci.yml` to `.github/workflows/ci.yml`. Check that every required variable in `server/.env.example` is in the CI `env` (dummy values only).

## 9. Verify (all must pass)
1. `docker compose ps` shows MySQL healthy.
2. `npm run data:download` then `npm run db:reset` in `server/` works and prints: 8 categories, 2,242 products (2,178 with a size chart), 17,022 variants, 2 users, 1 order. Running `npm run seed` again stops with the "not empty" message.
3. `npm test` and `npm run lint` pass in `server/` and `client/`. `npm run build` passes in `client/`.
4. Ask the user to import the files in `postman/` (see `postman/README.md`) and run the "Foundation" folder: `GET /api/health` returns 200 with `status: 'ok'`.
5. With both dev servers running, `http://localhost:5174` shows the home page with the health status (the proxy works).
6. The hook works: trying to create `test.ts` is blocked.
If a step fails, fix it before going on. Do not mark the foundation done with a failing step.

## 10. Finish
- Fill "How to run" in the root `README.md` (the exact commands).
- Fill the commands table in `stack.md` with the real scripts.
- Commit: `chore: project foundation`. After the user pushes, check that CI is green.
- Use `save-progress`. Next step: MVP step 2 (Catalog) with `add-feature`.
