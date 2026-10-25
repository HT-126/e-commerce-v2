---
name: resume-project
description: Use at the start of a session, or when returning to a project after a break, to find out exactly where the project stands (notes, git and a quick test run) before changing anything.
---

# Resume a project

Do not change any project files in this skill. Read, run checks and report only.

## 1. Read
- `CLAUDE.md`.
- The progress file (usually `.claude/knowledge/progress.md`), especially "In progress".
- `.claude/knowledge/decisions.md`, so settled choices are not reopened.
- The names of the files in `.claude/rules/` (read a rule only when its topic matters).

## 2. Check the repository
Run:
- `git branch --show-current`
- `git status --short`
- `git diff --stat` (what is changed but not committed)
- `git log -10 --oneline`

## 3. Check that it really works
Do not trust the notes alone.
- If MySQL is needed, check it runs (`docker compose ps`). If it is down, do not start it yourself: tell the user the command.
- Run the tests of the part named in "In progress" (or the whole suite if it is small): `npm test` in `server/` and/or `client/`. Tests use only the test database.
- If tests cannot run (database down, takes more than about 2 minutes), say so. Do not report it as a failure.

## 4. Compare
Compare the notes with git and the test result. Flag mismatches, for example:
- Commits that the progress file does not mention.
- Items marked done with no matching commit, or with failing tests.
- Uncommitted changes that "In progress" does not explain.
- Tests failing that the notes say pass, or "Failing tests" that now pass.
- The branch in the file is not the current branch.

## 5. Report
Keep it to about ten lines:
- Where the project stands (current focus).
- Current branch and uncommitted files.
- Test result: passed / failed (names) / not run (why).
- The "Next exact action" from the progress file.
- Mismatches, risks or blockers.
- A suggested first action.

Then ask the user which task to start. If the progress file is missing, say so and offer to create it with the `save-progress` skill.
