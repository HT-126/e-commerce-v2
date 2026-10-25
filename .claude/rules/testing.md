# Testing Rules

## Layers (test each thing at the lowest layer that can catch the bug)
| Layer | Tool | What | Where |
|---|---|---|---|
| 1. Unit | Vitest | Pure logic, no database: money, rules, formulas, data cleaning | `server/tests/unit/`, or next to the file in `client/src/` |
| 2. API | Vitest + Supertest + test database | Each endpoint through Express and MySQL: routes, auth, permissions, transactions | `server/tests/api/<resource>.test.js` |
| 3. Component | Vitest + React Testing Library | Forms, stores, loading / empty / error states, disabled buttons | Next to the component: `X.test.jsx` |
| 4. Manual | Postman + browser (the user) | The real flow and the look | `postman/`, UI checklist from `test-feature` |

Logic goes in small functions so it can be tested at layer 1. Layer 2 checks the wiring, not every branch of the logic again. End-to-end browser tests (Playwright) wait until after the MVP.

## Folders
```
server/tests/unit/  server/tests/api/  server/tests/fixtures/  server/tests/helpers/
```
- `fixtures/`: tiny sample data (a few rows). Never the full dataset.
- `helpers/`: `createUser`, `login` (returns an agent with the cookie), and one `create<Thing>` per main table.

## Each endpoint (layer 2)
Test at least: one valid request (check the response and the database), invalid input (`400`), not signed in (`401`), wrong role (`403`), another user's item (`404`), and the edge cases from `business-rules.md`.

## Test database
- Separate database `ecommerce_v2_test` (same MySQL container). A Vitest `globalSetup` runs migrations once. Never test against the dev or production database.
- Test files share one database, so run them one at a time: `fileParallelism: false` in `server/vitest.config.js`. Clean the tables each test uses in `beforeEach`.
- Rate limiters keep counts in memory across tests. Export the limiters and call `resetKey` (or create the app with fresh limiters) in `beforeEach`, so one test's failed sign ins never cause `429` in another. Never turn the limits off in tests: test them.
- Each test inserts the rows it needs. Tests are independent of each other and of the order they run in.

## Do not test
Styling and layout (the user checks them), library code (Knex, React, shadcn), and private details that can change without changing behavior.

## Always
- Every bug fix adds a test that fails before the fix.
- Claude writes and runs the automated tests. The user also runs a short Postman check per feature (see `test-feature` and `postman/README.md`). Postman never replaces automated tests.
- Do not mark a task done while tests fail. Do not weaken a test to make it pass.
- Must-test list per feature: `.claude/knowledge/test-plan.md`.
