---
name: test-feature
description: Use after building or changing a feature, to list test cases, write and run automated tests, prepare the Postman check for the user, and produce a manual UI checklist.
---

# Test a feature

The testing rules (tools, what to test, what not to test) are in `.claude/rules/testing.md`. Follow them. This skill is the order of work.

Two kinds of testing, both needed:
- **Automated tests (Claude)**: Vitest + Supertest. They prove the feature works and run in CI.
- **Postman check (the user)**: a short manual run of the real API, so the user understands it and confirms it works outside the tests.

## 1. Find what changed
Run `git status` and `git diff`. Read the feature in `product-spec.md` and its endpoints in `api.md`. Read the feature's section in `.claude/knowledge/test-plan.md`: every "must" line becomes a test.

## 2. List the cases first
Valid, invalid or missing input, boundaries, empty data, not signed in, not allowed, server error, duplicate action. Write the list before any test code.

## 3. Write and run automated tests
- Match the project's existing test setup and style.
- Write tests for logic and behavior. Skip styling.
- Run the new tests, then the whole suite.
- A failing test means fix the code. Change the test only if the test is wrong. Never weaken it to pass.
- A real bug: use `fix-bug`.

## 4. Update the Postman collection
Only if the feature adds or changes API endpoints. Follow `postman/README.md`.
- In the collection file in `postman/` (Postman Collection v2.1), add or update one folder named after the feature.
- Add the main flow in order, then 1 or 2 error cases. Use `{{baseUrl}}` and the collection variables; never real secrets.
- Each request gets a short description (what it shows) and a test script that checks the status code, for example:
  ```js
  pm.test("status is 201", () => pm.response.to.have.status(201));
  ```
- Keep the JSON valid (parse it after editing).

## 5. Postman check for the user
Give the user a short table to run in Postman (about 5 to 10 minutes):

| # | Request | Body | Expect |
|---|---|---|---|
| 1 | `POST /api/auth/login` | `{ "email": "{{demoEmail}}", "password": "{{demoPassword}}" }` | `200`, the session cookie is set |
| 2 | ... | ... | ... |

Rules for the table:
- Order matters: sign in first; Postman keeps the cookie for later requests to the same host.
- Main flow first, then 1 or 2 error cases (for example "not signed in → `401`", "empty cart → `400 CART_EMPTY`").
- Say exactly what to look at in the response (status, one or two fields, a header).
- Tell the user to run the folder with the Collection Runner if they want all checks at once.

## 6. Manual UI checklist
Give the user steps and expected results for: main flow, error messages, loading and empty states, phone and desktop width, keyboard and focus.

## 7. Report
What passed, what failed, what is not covered. Be honest about gaps. The feature is not done until the user has run the Postman check and the UI checklist (see `definition-of-done.md`).
