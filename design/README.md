# Design references

Put the screens Claude must match here. The self-check loop in `.claude/rules/frontend.md` compares the built page with these files.

## What to put here
- One image per page, at two widths: `<page>-desktop.png` (1280px wide) and `<page>-mobile.png` (390px wide). For example `home-desktop.png`, `home-mobile.png`.
- States that look different: `<page>-empty.png`, `<page>-error.png`, `<page>-loading.png` (only if you have them).
- The link to the Lumière canvas (and any other design tool) goes in `links.md`.

## Rules
- File names in `kebab-case`, matching the page names in `product-spec.md`.
- If a page has no image here, Claude follows `ui-design.md` and the spec, and says that there was no reference.
- When a design changes, replace the image (same name). Git keeps the old one.
- Keep images under about 1 MB each (PNG or WebP).

## Index
| Page | Desktop | Mobile | Notes |
|---|---|---|---|
| Home | `home-desktop.png` | `home-mobile.png` | From the Lumière canvas |
| Product | `product-desktop.png` | `product-mobile.png` | From the Lumière canvas |
| Login | `login-desktop.png` | `login-mobile.png` | From the Lumière canvas |
| Register | `register-desktop.png` | `register-mobile.png` | From the Lumière canvas |
| Shop, Cart, Orders, Admin | none yet | none yet | Follow `ui-design.md`; add images here when designed |
