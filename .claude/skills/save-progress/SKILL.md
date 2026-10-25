---
name: save-progress
description: Use at the end of a work session or after finishing a task, to update the project's progress file so the next session can resume exactly where this one stopped.
---

# Save progress

## Where
Use the project's progress file (usually `.claude/knowledge/progress.md`; check `CLAUDE.md`). If none exists, create it there.

## 1. Look before writing
Run `git branch --show-current`, `git status --short` and `git diff --stat`. Note which tests were run in this session and their result.

## 2. Uncommitted work
If there are uncommitted changes, ask the user whether to commit them now:
- On a feature branch: a `wip: <what>` commit is fine.
- On `main`: never commit unfinished work. Leave it uncommitted and record it in "In progress".

## 3. Update the file
Read the existing file first. Update it. Do not rewrite it from scratch.

Header line: `Updated: <date>  |  Branch: <branch>`.

Sections:
- **Current focus**: the one thing being worked on now.
- **Done**: finished and verified work, newest first. Keep only the last 5 items; older ones are in `git log`.
- **In progress**: for each unfinished item, all four lines:
  ```
  - <item> (branch `feature/x`)
    - Last step done: <what was finished, e.g. "cart API + tests pass">
    - Files in progress: <paths, or "none, all committed">
    - Failing tests: <test names and why, or "none" / "not run">
    - Next exact action: <one concrete action, e.g. "build CartPage.jsx using useCart()">
  ```
- **Next steps**: ordered, concrete, small.
- **Decisions**: one line pointing to `decisions.md`. Write each new decision there, one line with the reason. Never list decisions in this file.
- **Known issues**: open bugs and risks.

Move finished items from "In progress" to "Done".

## Rules
- Write only facts from this session. Mark anything not tested as "not tested". Never write "done" for work whose tests fail or were not run.
- This file is loaded every session, so keep it under about 30 lines.
- Never write secrets, keys or passwords.
- Do not copy content that already lives in another doc. Link to it instead.

## Finish
Show the user a summary of what changed in the file, in three lines or fewer, and whether anything is left uncommitted.
