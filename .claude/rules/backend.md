---
paths:
  - "server/**"
---
# Backend Rules

- Flow: route, then controller, then service. Keep logic out of routes and controllers. Knex queries live in services.
- Validate user input with Zod (see "Validation" below).
- One central error handler. Controllers pass errors to it with `next(err)`. Express 5 also catches errors thrown in async handlers.
- Response format: success `{ data }`, failure `{ error: { message, code?, details? } }`. Error codes are listed in `api.md`.
- Status codes: 200, 201, 204, 400 (bad input), 401 (not signed in), 403 (not allowed), 404, 409 (conflict), 429 (too many requests), 500.
- Passwords: hash with bcrypt. Never log or return them.
- Auth: JWT in an httpOnly cookie. Cookie settings and the dev proxy are in `stack.md` (Client to server). JWT expiry matches the cookie length. Middleware `requireAuth` on customer routes, `requireAdmin` on every `/api/admin/*` route (checks `role = 'admin'` from the database, not only from the token).
- Use Knex query builder or `knex.raw` with bindings (`?`). Never build SQL by joining strings.
- Money changes and stock changes run inside `knex.transaction`.
- Same origin (Vite proxy in dev, one domain in production), so no CORS middleware. If it is ever needed, allow only the client origin with `credentials: true`.
- Security middleware in `app.js`, in this order: `trust proxy` (only when `TRUST_PROXY` is set), `helmet()`, JSON body, cookie parser, routes.
- `TRUST_PROXY`: unset by default. Set it to the number of proxies in front of the API (for example `1`) only when there is one. Trusting `X-Forwarded-For` without a proxy lets anyone fake their IP and get around the rate limits.
- Rate limits with `express-rate-limit` in `middleware/rate-limit.js`, values from `business-rules.md`:
  - `loginIpLimiter` and `loginEmailLimiter` (`skipSuccessfulRequests: true`; the email key is trimmed and lower-cased, because it runs before Zod), `registerLimiter`.
  - Order on the route: limiters first, then `validate`, then the controller.
  - `standardHeaders: 'draft-7'`, `legacyHeaders: false`, and a `handler` that sends `{ error: { message, code: 'RATE_LIMITED' } }` with `429`, so the response matches `api.md`.
- Schema changes go through Knex migration files (`db-change` skill). Update seeds and `data-model.md` too.
- Never expose stack traces in responses.
- Never return stock numbers on customer routes. Only admin routes return `stock`.


## Validation (Zod)
- Validate every route that takes user input: `body` on POST, PUT and PATCH, and `query` or `params` when the route reads them.
- Routes with no input (for example `GET /api/categories`) need no schema.
- Put schemas in `server/src/schemas/`. Name them `<action><Resource>Schema`, for example `createReviewSchema`.
- Use the `validate` middleware below. On failure it returns `400 VALIDATION_ERROR` with the issues in `details`.

### Validation middleware
```js
// server/src/middleware/validate.js
// Usage: router.post('/', validate({ body: createReviewSchema }), controller.create)
// Validated values are put on req.valid, because req.query is read-only in Express 5.
export const validate = (schemas) => (req, res, next) => {
  req.valid = {};
  for (const part of ['body', 'query', 'params']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid input',
          code: 'VALIDATION_ERROR',
          details: result.error.issues,
        },
      });
    }
    req.valid[part] = result.data;
  }
  next();
};
```
Controllers read `req.valid.body`, `req.valid.query`, `req.valid.params`.

Never skip backend validation on a route that takes user input.
