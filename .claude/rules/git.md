# Git Rules

- `main` always works. Do not commit broken code to it.
- One branch per feature: `feature/<name>`. Bug fixes: `fix/<name>`.
- Small commits with clear messages: `feat: add cart store`, `fix: wrong total with 3 items`.
- Run lint and tests before committing.
- Never commit `.env`, `node_modules`, build output or local settings.
- Do not rewrite history on shared branches.
- Merge a feature only after tests pass and review is done.
