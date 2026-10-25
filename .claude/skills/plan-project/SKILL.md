---
name: plan-project
description: Use at the very start of a project, or when the user wants to change the plan, to fill the knowledge files (product spec, business rules, data sources, data model, API) by asking the user questions. Writes docs only, no code.
disable-model-invocation: true
---

# Plan a project

Goal: turn the user's idea into filled knowledge files that the other skills can build from. Do not write code in this skill.

## 0. Read first
- `CLAUDE.md`, `knowledge/stack.md`, and the files you will fill: `product-spec.md`, `business-rules.md`, `dataset.md`, `data-model.md`, `api.md`.
- If a file is already filled, do not start over. Only ask about `[TBD]` values, "(Default)" values, and what the user wants to change.

## 1. Ask, in rounds
Ask at most 4 questions per round. Use the question tool with options when it is available; otherwise ask in plain text. Offer a suggested answer for each question, marked "(suggested)", so the user can just confirm.

Round order:
1. **What and who**: one-sentence product, users and roles, the goal of the MVP, design reference (files, link, or none).
2. **MVP features**: 3 to 7 features in build order. For each: what it does and a "Done when" that can be checked. Everything else goes to "Later".
3. **Pages and flows**: pages with route and who can open them; 2 to 4 main user flows.
4. **Rules**: permissions table (who can do what), limits and numbers, statuses and allowed changes, money (if any).
5. **Data**: does the app import a dataset or call an outside API? If yes, get the link and go to step 2 before designing tables.

Never invent a feature, number or rule. If the user does not know, write `[TBD]`, or a suggested value marked "(Default)" only if the user accepts it.

## 2. Check real data (only if there is outside data)
- Download or fetch a sample. Run a short script and record in `dataset.md`: row count, empty fields, real values of fields you might make an `enum`, longest text per field, duplicates in fields that should be unique, data stored as HTML, and what is missing.
- Pin the version (commit SHA, release or date).
- Show the user the surprises (missing fields, messy values) and agree how to handle each.

## 3. Draft the design
- `data-model.md`: tables, columns with types sized from the real data, keys, relations, indexes, seed data and expected counts.
- `api.md`: endpoints for each MVP feature, with auth, input, response, errors and schema names. Use the shared formats already in the file.
- Keep it simple: no table or endpoint that no MVP feature needs.

## 4. Review with the user
Show a short summary (about 20 lines): features in order, tables, endpoints per feature, open `[TBD]` items. Ask for changes. Repeat until the user approves.

## 5. Write
- Write the approved content into the knowledge files. Fill `CLAUDE.md` (project name and one sentence).
- Pick the UI helper line in `stack.md` with the user (plain Tailwind, shadcn for admin only, or shadcn for the whole app).
- Add the main choices to `decisions.md`, one line each with a reason.
- Set `progress.md` > Next steps to: "Type `/setup-project`."

## 6. Finish
Report in 5 lines or fewer: what was filled, how many `[TBD]` items are left, and the next step (type `/setup-project`).
