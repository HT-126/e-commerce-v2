---
name: add-feature
description: Use when asked to build a new feature end to end (data, backend, frontend). Plans first, builds in layers, then checks the result against the definition of done.
---

# Add a feature

The process is in `.claude/knowledge/workflow.md` (feature loop). The finish line is `.claude/knowledge/definition-of-done.md`. This skill is the step-by-step run of that loop.

## 1. Read
- `CLAUDE.md`, `progress.md`, `decisions.md`, and the feature in `product-spec.md`. Do not reopen a settled decision; ask the user if one blocks the plan.
- `business-rules.md`, `data-model.md` and `api.md` for the parts it touches. `dataset.md` if it touches product data.
- Stack, folders and commands come from `stack.md` and `.claude/rules/`. Do not assume them.
- Read the rule files for every layer the feature touches now, before planning: `backend.md` for `server/`, `frontend.md` and `ui-design.md` for `client/`. Rules with `paths:` load only after you open a file in that folder, so a plan made without reading them can miss them.

## 2. Plan first
Use Plan Mode. Show the user a short plan and wait for approval. Expect 2 to 3 rounds of feedback before you build:
- Goal in one sentence.
- Data, API and UI changes. Files you expect to touch.
- Edge cases and what is out of scope.
- Anything you would add that the spec does not ask for: leave it out, or ask.

Tiny change: a one-line plan is enough.

After approval, create the branch `feature/<name>` from `main` (see `.claude/rules/git.md`).

## 3. Contract first
Update `data-model.md` and `api.md` before any code. For database changes, use the `db-change` skill.

## 4. Build in layers
Data, then backend, then frontend. Each layer must run before the next starts. Follow the rules in `.claude/rules/`. Touch only files the plan names.

## 5. Check
- Use `test-feature`.
- Run lint, tests and build.
- For UI, run the self-check loop in `.claude/rules/frontend.md`.
- Go through `definition-of-done.md`. Do not report done while an item fails.
- Run the `code-reviewer` agent and fix every "Must fix" item.

## 6. Merge
- Commit in small steps with clear messages.
- Ask the user to confirm. Then merge into `main` and run the tests again on `main`.
- Never merge without the user's confirmation.

## 7. Save and continue
Use `save-progress`. Then suggest the next feature from the MVP list in `product-spec.md`.

If you are blocked or the plan no longer fits, stop and tell the user.
