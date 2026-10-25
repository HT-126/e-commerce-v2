---
paths:
  - "client/**"
---
# UI Design Rules

Tokens for Lumière live in `client/src/index.css`. Customer pages and admin pages (shadcn/ui) share the same colors, so `bg-primary` means the same thing everywhere. Use class names, not hex values.

```css
/* client/src/index.css */
@import "tailwindcss";
@import "tw-animate-css"; /* added by shadcn init */

/* 1. shadcn/ui variables, set to Lumière colors */
:root {
  --radius: 1rem;
  --background: #F3F0E8;
  --foreground: #23261F;
  --card: #E9E6DB;
  --card-foreground: #23261F;
  --popover: #F3F0E8;
  --popover-foreground: #23261F;
  --primary: #34412F;
  --primary-foreground: #F3F0E8;
  --secondary: #E4E1D3;
  --secondary-foreground: #23261F;
  --muted: #E4E1D3;
  --muted-foreground: #4A5143;
  --accent: #E4E1D3;
  --accent-foreground: #23261F;
  --destructive: #9A3B2E;
  --border: #D3CFC1;
  --input: #D3CFC1;
  --ring: #34412F;
}

/* 2. Map them to Tailwind classes (bg-primary, text-muted-foreground, ...) */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

/* 3. Lumière-only tokens */
@theme {
  --color-page: #F3F0E8;          /* page background       -> bg-page */
  --color-ink: #23261F;           /* text                  -> text-ink */
  --color-ink-soft: #4A5143;      /* secondary text        -> text-ink-soft */
  --color-on-primary: #F3F0E8;    /* text on primary       -> text-on-primary */
  --color-panel: #E4E1D3;         /* hero / soft panel     -> bg-panel */
  --color-accent-light: #B9C4AA;  /* light accent on dark  -> text-accent-light */
  --color-highlight: #7F8672;     /* italic highlight      -> text-highlight */
  --color-footer: #1F271C;        /* footer                -> bg-footer */
  --color-error: #9A3B2E;         /* errors                -> text-error */

  --font-serif: "Newsreader", serif;          /* headings -> font-serif */
  --font-sans: "Instrument Sans", sans-serif; /* body     -> font-sans */
}
```
Load both fonts from Google Fonts in `client/index.html`.

`shadcn init` rewrites `index.css` with its own default colors. Right after running it, put the file back to the version above (keep any lines it added that are not colors).

Text must keep at least 4.5:1 contrast.

## Type
- Headings: `font-serif`. Highlight one phrase per heading in italic (`italic text-highlight`).
- Body and UI: `font-sans`.

## Shape and spacing (customer pages)
- Buttons and inputs: `rounded-full`, at least 44px tall (`min-h-11`).
- Cards: `rounded-[20px]` to `rounded-[36px]`. Hero images: arched top (`rounded-t-full`).
- Page width: `max-w-7xl mx-auto px-6`.
- Layout: flex wrap and grid, so it works from phone to desktop.

## Colors and sizes on the product page
- The dataset has color names only, no color codes. Show colors as text chips (rounded-full, border), not as color dots.
- Sold-out size or color: show it disabled with a line through, never hidden.

## Admin (shadcn/ui + TanStack Table)
- Layout: fixed left menu (Products, Orders, Reviews, "Back to store"), top bar with the admin name and Sign out, content on the right. Built with plain Tailwind.
- Use shadcn/ui components with their default shapes (they use `--radius`). Do not restyle them per page.
- Tables: the shared `DataTable` (see `frontend.md`). Status shown with `Badge`.
- Feedback: `sonner` toast after every save, delete or status change. `AlertDialog` before hiding a product, cancelling an order or deleting a review.
- No hero images, no serif headings except the page title.

## Components
Customer pages: reuse before creating `Header`, `Footer`, `ProductCard`, `Button`, `PasswordInput`, `QuantityStepper`, `OptionChip`, `RatingStars`.
Admin pages: `components/ui/*` (shadcn), `components/admin/AdminLayout`, `components/admin/DataTable`, `components/admin/StatusBadge`.
