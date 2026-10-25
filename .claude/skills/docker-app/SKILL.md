---
name: docker-app
description: Use when the user types /docker-app, after the first features work, to run the whole app (MySQL + API + built client) with one Docker command for demos and the CV. Dev work keeps using npm run dev.
disable-model-invocation: true
---

# Run the whole app with Docker

Goal: anyone who clones the repo runs `docker compose --profile app up --build` and opens `http://localhost:3002` to get the site and the API. Daily coding still uses `npm run dev` (fast reload); this is for demos, testing a production-like build, and the CV.

Do not change how dev works: `docker compose up -d` (no profile) must still start only MySQL.

## 0. Check
- Read `stack.md` (ports, names, cookie) and `deploy-checklist.md`.
- The foundation works (`npm test`, `npm run build` in `client/`) and at least one feature is done.
- Show the user the plan (steps below, one line each) and wait for OK.

## 1. Express serves the built client
In `server/src/app.js`, only when `NODE_ENV=production`:
- Serve static files from `server/public` (the built client).
- For any GET that does not start with `/api`, send `public/index.html` (so refreshing `/products/x` works).
- API routes and the 404 for unknown `/api/*` stay as they are.
- Cookie `secure` comes from `COOKIE_SECURE` (default `true` in production). The local Docker run sets it to `false`, because it is plain `http://localhost`. Add `COOKIE_SECURE` to `server/.env.example` and to the startup check as optional.

## 2. Start script
`server/scripts/docker-start.sh` (POSIX `sh`, `set -e`):
1. `node scripts/download-data.js` (same as `npm run data:download`: downloads the pinned `products.json` to `db/data/`, skips if the file exists)
2. `npx knex migrate:latest`
3. `npx knex seed:run` (the seed already stops when `products` has rows)
4. `exec node src/server.js`
Rules: the seed must exit with code 0 when the database already has data (print "Seed skipped: database not empty"), so a restart never fails or seeds twice.

## 3. Dockerfile (repo root, multi-stage)
- Base image `node:22-alpine` in every stage.
- Stage `client`: copy `client/package*.json`, `npm ci`, copy `client/`, `npm run build`.
- Stage `server-deps`: copy `server/package*.json`, `npm ci --omit=dev`.
- Stage `runtime`: `WORKDIR /app/server`, copy `server/` and the production `node_modules`, copy the client build to `server/public`, `ENV NODE_ENV=production`, `EXPOSE 3002`, run as the `node` user, `CMD ["sh", "scripts/docker-start.sh"]`.
- Anything the start script needs at run time (Knex CLI, `node-html-parser` for the seed) must be in `dependencies`, not `devDependencies`. Move it if needed and tell the user.

## 4. `.dockerignore` (repo root)
`**/node_modules`, `**/.env`, `**/.env.*` (but keep `!**/.env.example`), `.git`, `client/dist`, `coverage`, `server/db/data`, `design`, `postman`, `.claude`, `.github`.

## 5. Compose service
Add to `docker-compose.yml`, keeping the `mysql` service as it is:
```yaml
  app:
    profiles: ["app"]
    build: .
    container_name: ecommerce_v2_app
    env_file: server/.env
    environment:
      NODE_ENV: production
      DB_HOST: mysql          # service name inside the Docker network
      DB_PORT: "3306"         # MySQL's port inside the network, not the host port
      COOKIE_SECURE: "false"  # plain http on localhost
    ports:
      - "3002:3002"
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - seed_data:/app/server/db/data   # keeps the 30 MB dataset between runs
```
And at the bottom, next to the MySQL volume:
```yaml
volumes:
  seed_data:
```
- The first start downloads the dataset (needs internet) and seeds 2,242 products; later starts skip both.
- The `mysql` service must have a healthcheck (`mysqladmin ping`). Add one if it is missing.
- Never add `container_name` or ports that another project on this machine uses (see `stack.md`).

## 6. Verify (all must pass)
1. Stop the dev server first (it uses the same port). Then `docker compose --profile app up --build -d`.
2. `docker compose logs app` shows: migrations done, "8 categories, 2,242 products, 17,022 variants" (or "Seed skipped"), "listening on 3002".
3. `http://localhost:3002` shows the home page; refreshing a deep link (another route) still works.
4. In Postman (environment "Local", same `baseUrl`), run the "Foundation" folder and the sign-in request: 200, and the cookie is set.
5. `docker compose --profile app restart app`: the logs say "Seed skipped", nothing breaks.
6. `docker compose up -d` without the profile still starts only MySQL. `npm run dev` still works.
7. `docker image ls` shows the app image under about 300 MB. If it is much bigger, check `.dockerignore`.

If a step fails, fix it before going on.

## 7. Finish
- Root `README.md`: add "Run with Docker" with the exact commands:
  - start: `docker compose --profile app up --build`
  - stop: `docker compose --profile app down` (keeps the data)
  - reset the data: `docker compose --profile app down -v` (deletes this project's database volume only; say so clearly)
- `stack.md`: add the `app` service and `COOKIE_SECURE` to the Docker and environment sections. `deploy-checklist.md`: note that `/docker-app` is the production-like local check before staging.
- Commit `feat: run the whole app with Docker`, then `save-progress`.
