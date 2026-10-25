---
name: fix-bug
description: Use when something is broken or behaves wrongly. Reproduces the bug, finds the root cause, adds a failing test, applies the smallest fix, and checks for the same bug elsewhere.
---

# Fix a bug

## 1. Reproduce
- Get the exact steps, input and error message from the user or the logs.
- Reproduce it yourself. If you cannot, say so and ask for more detail. Do not guess a fix.

## 2. Find the root cause
- Read the code path from the entry point to the failure.
- Check recent changes with `git log` and `git blame` on the affected files.
- State your hypothesis and the evidence for it.
- Fix the cause, not the symptom. A try/catch that hides the error is not a fix.

## 3. Write a failing test first
- Add a test (or a minimal repro script if tests are not possible) that fails because of this bug.
- Follow the project's test setup. Confirm the test fails before the fix.

## 4. Apply the smallest fix
- Change only what the cause requires.
- If the fix needs a design change or touches many files, stop and ask the user first.

## 5. Verify
- The new test passes.
- The whole test suite and the lint command pass.
- Re-run the original steps from step 1.

## 6. Look for the same bug elsewhere
Search for the same pattern in the codebase. Fix real matches or list them for the user.

## 7. Report
Give: the cause, the fix, the test you added, and any related risk. If the bug is not fully solved, add it under "Known issues" with the `save-progress` skill.

## Rules
- No unrelated changes or cleanups in the same fix.
- Never delete or disable a failing test to make the suite pass.
