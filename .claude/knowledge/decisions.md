# Decisions

Settled choices and why, so they are not reopened by mistake. Not loaded every session: read it before planning a feature or changing the stack. To change a decision, ask the user, then edit the line and add the new reason.

Format: `- <decision> (reason: <why>)`. Newest at the bottom. Details live in the file named in the line; do not copy them here.

- Clothing only, 8 flat categories (reason: simpler sizes, menu and data model).
- Knex, not Sequelize (reason: close to SQL, built-in migrations, easy atomic stock update).
- Admin: own pages with React + Tailwind, plus shadcn/ui (JS) and TanStack Table, admin only (reason: faster forms and tables, still our own code and stack; shadcn-admin template rejected because it is TypeScript with another router).
- Stock seeded as 10 or 0, hidden from customers (reason: the dataset has only in stock true/false).
- No color codes (reason: not in the dataset). Size chart, highlights and fit text are parsed from `description_html` in the seed.
- Only buyers can review: needs a `delivered` order for the product (reason: owner's choice; reviews are trustworthy).
- No checkout form: "Pay" on the cart page places the order, mock payment always succeeds, no address stored (reason: keep the demo simple).
- Testing: Claude writes and runs automated tests; the user runs a short Postman check per feature with the collection in `postman/` (reason: learn the API, confirm it works for real).
- Project `e-commerce-v2`, new repo; v1 (`HT-126/e-commerce`) is left untouched. Own container, ports and databases (see `stack.md`) (reason: run both side by side, never overwrite v1).
- Docker: MySQL only while coding (`npm run dev` for fast reload); `/docker-app` adds a one-command full run (profile `app`, container `ecommerce_v2_app`) after the first features (reason: demo and CV without slowing dev).
- Rate limits from v1, improved (values in `business-rules.md`) (reason: v1 had no tests and a different error format).
- Dataset pinned to commit `0ce98ce` (reason: the source repo changes every week).
- Bottoms = source categories Pants, Shorts and Skirts (226 products); Skorts is not imported (reason: the 226 count in `dataset.md` matches only these three).
- Size chart kept only when the first table header starts with `Size`: 2,174 products, not 2,178 (reason: 4 tables are model measurements or a set table, not size charts).
- `@hookform/resolvers` pinned to `^5` (reason: v6 has a peer dependency conflict with `npm install`).
- Client linter is oxlint, the Vite template default (reason: no extra dependency; ESLint would be a new one).
- Flat shipping $6.95 under $97.00, cookie 30 days / 1 day, rate limits as in `business-rules.md` confirmed as final (reason: owner reviewed the defaults).
