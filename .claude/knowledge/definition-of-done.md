# Definition of Done

A feature is done only when every box is true.

- [ ] Matches `product-spec.md`, `api.md` and `business-rules.md`
- [ ] `data-model.md` and `api.md` updated if anything changed
- [ ] Backend validates user input with Zod
- [ ] Admin routes check the admin role; customer routes never return stock numbers
- [ ] Loading, empty and error states handled in the UI
- [ ] Styled with Tailwind theme tokens (admin: shadcn/ui components); works at phone width and desktop width
- [ ] UI compared with the reference or spec; differences listed and fixed
- [ ] New logic has automated tests, and failure paths are tested
- [ ] Whole test suite and lint pass
- [ ] Postman collection updated for new or changed endpoints, and the user ran the Postman check
- [ ] Manual UI checklist done by the user
- [ ] `code-reviewer` found no "Must fix" items
- [ ] No secrets, no `.ts` files, no unrelated changes
- [ ] `progress.md` updated
