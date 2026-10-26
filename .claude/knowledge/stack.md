# Stack and Commands

Language: JavaScript only. No TypeScript. ES modules everywhere.

## Stack
| Layer | Choice |
|---|---|
| Frontend | React + Vite (template `react`), React Router |
| Styling | Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/vite`) |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | HTML validation; React Hook Form + Zod for large forms |
| Backend | Node.js + Express 5 |
| Validation | Zod |
| Database | MySQL 8 in Docker (Docker Compose) |
| Query builder and migrations | Knex (`mysql2` driver) |
| Auth | JWT in an httpOnly cookie, bcrypt for passwords |
| Security | `helmet`, `express-rate-limit` (limits in `business-rules.md`) |
| Tests | Vitest, React Testing Library, Supertest |
| Lint / format | ESLint, Prettier |

Why Knex and not an ORM (Sequelize): Knex is close to plain SQL, has migrations and seeds built in, and makes the stock update (`UPDATE ... WHERE stock >= ?`) and transactions easy to write and read.

Admin area: our own pages with React + Tailwind + TanStack Query, plus two helpers used only in admin:
| Admin helper | Use |
|---|---|
| shadcn/ui (JavaScript, `"tsx": false`) | ready-made form, table, dialog and toast components, copied into `client/src/components/ui/` |
| TanStack Table (`@tanstack/react-table`) | sorting, paging and column logic for the admin tables (server side) |

No admin template (for example shadcn-admin): it is TypeScript and uses another router.

## shadcn/ui setup (once, in `client/`)
1. Add the `@/` alias: `jsconfig.json` with `"paths": { "@/*": ["./src/*"] }`, and `resolve.alias` `'@': path.resolve(__dirname, './src')` in `vite.config.js`.
2. `npx shadcn@latest init`, then set `"tsx": false` in `components.json` (if it is not already).
3. Put `src/index.css` back to the Lumière version in `ui-design.md`.
4. Add components only when a page needs them: `npx shadcn@latest add button input label table`.
5. Check: the new files end in `.jsx`.

## Client to server (cookies)
- Dev: Vite proxies `/api` to `http://localhost:3002` (`server.proxy` in `vite.config.js`). The client always calls relative URLs like `/api/products`, so the cookie is same-origin and CORS is not needed in dev.
- Production: serve the client and the API from the same domain. Express serves the built client from `server/public` when `NODE_ENV=production` and the folder exists (the Docker image puts `client/dist` there); otherwise the server answers the API only, for a client hosted elsewhere. Then the cookie can stay `SameSite=Lax`.
- Cookie: name `token`, `httpOnly`, `sameSite: 'lax'`, `secure` in production (the setting `COOKIE_SECURE=true|false` overrides it; the local Docker run is plain http and sets false), `path: '/'`.

## Seed helper
- `node-html-parser` (server **dependency**, not devDependency, so the Docker image can seed) parses `description_html` in the seed only.

## Ports and names (v2 runs next to v1)
| | v1 (`e-commerce`) | v2 (this project) |
|---|---|---|
| MySQL container | `ecommerce_mysql` | `ecommerce_v2_mysql` |
| MySQL host port | 3306 | 3307 (`DB_PORT=3307` in `server/.env`) |
| Databases | `ecommerce` | `ecommerce_v2`, `ecommerce_v2_test` |
| Server | 3001 | 3002 |
| Client | 5173 | 5174 (`server.port: 5174`, `strictPort: true`) |
Never connect v2 to the v1 container or database.

## Docker
- `docker-compose.yml` runs MySQL 8 (container `ecommerce_v2_mysql`, host port 3307 (v1 keeps 3306)) with a volume.
- Two databases: `ecommerce_v2` (dev) and `ecommerce_v2_test` (tests). Create both in an init SQL file.
- Service `app` (profile `app`, container `ecommerce_v2_app`, port 3002) runs the whole app from the root `Dockerfile` (3 stages on `node:22-alpine`, runs as the `node` user, about 280 MB). `docker compose --profile app up --build` starts it; plain `docker compose up -d` still starts only MySQL. It reads `server/.env` and overrides `NODE_ENV=production`, `DB_HOST=mysql`, `DB_PORT=3306`, `COOKIE_SECURE=false`. It uses the same database as `npm run dev`, and the two share port 3002, so only one runs at a time.
- `server/scripts/docker-start.sh` is what the image runs: download the dataset (skipped if present), `knex migrate:latest`, `knex seed:run` (skips a database that has products), then the server. The dataset lives in the volume `seed_data` (`/app/server/db/data`).
- The server sends a content security policy that allows images from any `https` address (the photos live on `cdn.shopify.com` and `livostyle.com`), and "upgrade insecure requests" only when `COOKIE_SECURE` is true.

## Commands
| Task | Command |
|---|---|
| Start database | `docker compose up -d` |
| Run the whole app in Docker | `docker compose --profile app up --build` (http://localhost:3002; stop `npm run dev` first) |
| Install | `npm install` in `client/` and `server/` |
| Reset database (dev) | `npm run db:reset` in `server/` |
| Download dataset | `npm run data:download` in `server/` (see `dataset.md`) |
| Migrate | `npm run migrate` in `server/` (`knex migrate:latest`) |
| Undo last migration | `npm run migrate:rollback` in `server/` |
| Seed | `npm run seed` in `server/` (`knex seed:run`) |
| Run client | `npm run dev` in `client/` (port 5174) |
| Run server | `npm run dev` in `server/` (port 3002) |
| Test client | `npm test` in `client/` |
| Test server | `npm test` in `server/` (uses `ecommerce_v2_test`) |
| Lint | `npm run lint` in `client/` (oxlint, the Vite template's linter) and in `server/` (ESLint) |
| Build client | `npm run build` in `client/` |
| Format | `npm run format` in `client/` and `server/` (shared `.prettierrc.json` at the root) |

## Environment variables
Root `.env` (only for `docker-compose.yml`): `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` (the password of the app user `lumiere`; same value as `DB_PASSWORD`).

Server: real values live in `server/.env` (never committed). Names are listed in `server/.env.example`:
`PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_NAME_TEST`, `JWT_SECRET` (at least 32 characters in production), `TRUST_PROXY` (optional, unset unless behind a proxy), `COOKIE_SECURE` (optional `true` or `false`; default true in production, false otherwise), `DEMO_CUSTOMER_EMAIL`, `DEMO_CUSTOMER_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
