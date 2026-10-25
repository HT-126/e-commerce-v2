---
name: db-change
description: Use to change the database structure (add or alter tables, columns, indexes) safely, with a Knex migration, updated seed data and updated docs.
---

# Change the database

The project uses Knex migrations in `server/db/migrations/` and seeds in `server/db/seeds/`. Commands are in `stack.md`.

## 1. Plan
- Read `data-model.md` and the latest migrations to follow their style.
- State the change, why it is needed, and what existing data it affects.
- If the change can lose or rewrite data (drop, rename, type change), stop and show the user the plan and a backup step first.

## 2. Migration
- Create a new file with `npx knex migrate:make <name>` (in `server/`). Never edit a migration that has already been applied.
- Write `export async function up(knex)` and `export async function down(knex)`. `down` must undo `up`.
- For a new required column on a table with data, add it as nullable or with a default, fill existing rows, then tighten it.
- Add indexes for columns used in filters, sorts and joins.
- Raw SQL only when the builder cannot do it (for example `CHECK` rules), with `knex.raw`.

## 3. Keep everything in sync
- Update `data-model.md` in the same change.
- Update the seed and `dataset.md` if imported fields change.
- Update Zod schemas and `api.md` if request or response shapes change.
- Update code that reads or writes the changed columns.

## 4. Verify
- `npm run migrate:rollback` then `npm run migrate` on the dev database, then `npm run seed`.
- Run the full test suite (it migrates `ecommerce_v2_test`).

## 5. Finish
Report the migration file, the data risk, and the exact command to apply it. Never run a migration against production yourself.
