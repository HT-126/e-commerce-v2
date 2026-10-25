# Lumière

An online store for women's clothing, with a shop for customers and an admin area for the owner. Portfolio project. Keep it simple.

JavaScript only (no TypeScript). React + Tailwind in `client/`, Express + Knex + MySQL in `server/`.

## Read first
@.claude/knowledge/progress.md

## Read when needed
- Stack and commands: `.claude/knowledge/stack.md`
- What we build: `.claude/knowledge/product-spec.md`
- Business rules: `.claude/knowledge/business-rules.md`
- Database: `.claude/knowledge/data-model.md`
- Source data and import rules: `.claude/knowledge/dataset.md`
- API contract: `.claude/knowledge/api.md`
- What each feature must test: `.claude/knowledge/test-plan.md`
- Design images: `design/` (see `design/README.md`)
- Postman collection for manual API checks: `postman/` (see `postman/README.md`)
- Deploying: `.claude/knowledge/deploy-checklist.md`
- Decisions already made, with reasons: `.claude/knowledge/decisions.md`
- Workflow and done checklist: `.claude/knowledge/workflow.md`, `.claude/knowledge/definition-of-done.md`

## Rules
Project rules are in `.claude/rules/`. Frontend and backend rules load by folder.

## How to work
- Never read, print or edit `.env` files. Use `.env.example` for names; ask the user for values.
- Plan first for any change that touches more than one file.
- Build one feature at a time: data, then API, then UI.
- Keep it simple. Do not add features, layers or libraries the spec does not ask for.
- Do not mark work done while tests or lint fail.
- Ask before adding a dependency.
- Start a session with the `resume-project` skill. End it with `save-progress`.
- New project: the user types `/plan-project` (fill the knowledge files), then `/setup-project` (foundation). These two run only when the user types them. Then one `add-feature` per MVP feature.
- Skills: `plan-project`, `setup-project`, `docker-app`, `add-feature`, `test-feature`, `fix-bug`, `db-change`, `resume-project`, `save-progress`.
- Use the `code-reviewer` agent before merging a large feature.
