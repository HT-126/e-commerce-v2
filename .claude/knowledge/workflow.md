# Workflow

## Setup (once)
1. **Plan**: type `/plan-project`. It fills `product-spec.md`, `business-rules.md`, `dataset.md`, `data-model.md` and `api.md` with the user (already filled for Lumière: it only asks about `[TBD]` and "(Default)" values).
2. **Design**: put page images in `design/`. Check the tokens in `rules/ui-design.md`.
3. **Foundation**: type `/setup-project` (on `main`). Done when its "Verify" list passes and CI is green.

## Feature loop (repeat for each feature)
Use the `add-feature` skill. It runs: plan (Plan Mode, branch `feature/<name>`), build (data, then API, then UI), test, review with `code-reviewer`, merge, save progress.

## Run the whole app with Docker
After the first features work, the user types `/docker-app` once. Then `docker compose --profile app up --build` runs MySQL, the API and the built client together. Dev work keeps using `npm run dev`.

## Ship
Run the Docker version first (production-like check). Then follow `deploy-checklist.md`: staging, then production, then monitor.

## Session routine
- Start: `resume-project` skill.
- End: `save-progress` skill.

## Feature order
The MVP list in `product-spec.md` is the order:
1. Foundation and data
2. Catalog
3. Accounts
4. Cart
5. Pay and orders
6. Reviews
7. Admin
