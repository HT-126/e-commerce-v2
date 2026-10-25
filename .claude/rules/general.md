# General Rules

- JavaScript only. Do not create `.ts` or `.tsx` files. Do not install `typescript`.
- Use `const` and `let`. Use ES modules (`import` / `export`). `"type": "module"` in both `package.json` files.
- Name files and folders in `kebab-case`, except React component files: `PascalCase.jsx` (`ProductCard.jsx`). Files in `components/ui/` keep the kebab-case names shadcn gives them (`alert-dialog.jsx`).
- Keep functions short and single-purpose.
- Comments explain why, not what.
- Never commit secrets. Read them from `.env`. Keep `.env.example` up to date.
- No new dependency without asking the user.
- Do not change files outside the task. No drive-by refactors.
- Keep it simple. Pick the plainest solution that meets the spec. No extra abstraction "for later".

## Folders
Group code by layer (this matches the existing repo):

```
server/src/
  routes/        one file per resource, e.g. products.routes.js
  controllers/   read req, call a service, send the response
  services/      business logic and Knex queries
  schemas/       Zod schemas
  middleware/    auth, require-admin, validate, error-handler
  db/knex.js     the Knex instance
server/db/
  migrations/  seeds/  data/
client/src/
  pages/         one folder per page; admin pages in pages/admin/
  components/    shared customer UI (Button, ProductCard, ...)
  components/ui/     shadcn/ui files (admin only, generated)
  components/admin/  AdminLayout, DataTable, StatusBadge
  services/      API calls
  hooks/         TanStack Query hooks
  stores/        Zustand stores
  lib/           small helpers (format money, etc.)
```
