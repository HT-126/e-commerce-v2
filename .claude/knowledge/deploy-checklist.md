# Deploy Checklist

Never deploy to production without the user's explicit go-ahead. Staging first. Never put secrets in the repository or in notes.
Hosting choices go in `stack.md` once decided. Check each host's current free-tier limits before choosing.

## Before any deploy
- [ ] `docker compose --profile app up --build` works locally (see the `docker-app` skill)
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
