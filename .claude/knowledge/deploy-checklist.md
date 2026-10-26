# Deploy Checklist

Never deploy to production without the user's explicit go-ahead. Staging first. Never put secrets in the repository or in notes.
Hosting choices go in `stack.md` once decided. Check each host's current free-tier limits before choosing.

## Before any deploy
- [ ] `docker compose --profile app up --build` works locally (see the `docker-app` skill). This is the production-like local check before staging: it runs the same `NODE_ENV=production` build that is deployed. Real HTTPS hosting keeps `COOKIE_SECURE` unset (secure cookies); only the local Docker run turns it off.
- [ ] On the branch to ship, working tree clean
- [ ] Tests, lint and build pass
- [ ] Every environment variable the app reads is listed in `.env.example`
- [ ] No secrets in code or git history
- [ ] Dependency audit run (`npm audit`); high and critical issues reviewed

## Staging
- [ ] Environment variables set on the host
- [ ] Database backed up, then migrations applied (user reviewed the plan)
- [ ] Server deployed, then client deployed, client points to the staging API
- [ ] CORS allows only the client origin
- [ ] Smoke test: home page, sign up and sign in, the core feature, one failure case
- [ ] Logs checked for errors

## Staging on Render + Aiven (the owner does the account steps; no secrets in the repo)
The repo is ready (TLS setting `DB_SSL`, start script seeds only an empty catalog). Nothing is deployed until the owner says go.
- [ ] **Aiven:** create a free MySQL service. Note host, port, user, password and database name; download the CA certificate.
- [ ] **Render:** New Web Service from the GitHub repo, runtime Docker, free plan, health check path `/api/health`, auto-deploy off.
- [ ] **Environment variables on Render** (names only here): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`, `DB_SSL_CA` (the certificate text, line breaks written as `\n`), `JWT_SECRET` (new, 32+ characters, not the dev one), `TRUST_PROXY=1`, `DEMO_CUSTOMER_EMAIL`, `DEMO_CUSTOMER_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (strong: the site is public). Render sets `PORT`. Leave `COOKIE_SECURE` and `DB_NAME_TEST` unset.
- [ ] **First start** migrates and seeds by itself (checked locally with 512 MB and an empty database: it fits, about 35 MB at rest). If Render stops it for memory, run `npx knex migrate:latest` and `npx knex seed:run` once from your computer with the Aiven values in a temporary `server/.env`.
- [ ] Logs show "Catalog already filled" on later starts and no database errors.
- [ ] Smoke test on the Render address: home page, sign up and sign in, add to bag and Pay, the admin area, one failure case.
- [ ] Record the staging URL in `progress.md`.

## Production (after staging passes and the user approves)
- [ ] Production environment variables set
- [ ] HTTPS on, correct domain, secure cookies
- [ ] Database backup taken before migration, and a backup schedule exists
- [ ] Rollback ready: previous version and database backup
- [ ] Record URLs, version and rollback steps in `progress.md`

## Monitor (regularly)
- [ ] Watch error logs and uptime
- [ ] Verify backups can be restored
- [ ] Update dependencies and re-run the audit
- [ ] Collect feedback, add it to the MVP or "later" list in `product-spec.md`
