---
paths:
  - "client/**"
---
# Frontend Rules

- React function components and hooks only. React Router for pages.
- Style with Tailwind CSS utility classes. No other CSS library, no CSS modules, no inline `style` except for values that come from data.
- Use the theme tokens from `ui-design.md` (`bg-page`, `text-ink`, `bg-primary`, ...). Do not write raw hex values in class names.

## Data and state

### Where each kind of data lives
| Data | Tool |
|---|---|
| Data from the server | TanStack Query |
| Client-only state (guest cart, UI flags) | Zustand |
| Form input | Local state or React Hook Form |
| Data that must survive a refresh | Zustand `persist` (uses `localStorage`) |

### TanStack Query
- Fetch data with `useQuery`. Change data with `useMutation`.
- Do not use `useEffect` + `fetch` to load data.
- Use clear query keys, for example `['products', { category, sort, page }]`, `['admin', 'orders', { status, page }]`.
- After a mutation, call `queryClient.invalidateQueries` to refresh the data.
- Put API calls in `src/services/`. Put query hooks in `src/hooks/`.

### Zustand
- Use Zustand only for client state.
- Do not copy API data into a Zustand store. TanStack Query already owns it.
- One store per feature, named `use<Feature>Store`.
- Select only what you need: `useStore((s) => s.value)`.

### Zod in forms (optional)
- Use Zod only for large forms (register, admin product form), with React Hook Form and `zodResolver`.
- For simple forms, use HTML validation (`required`, `type="email"`, `minLength`).
- Do not validate responses from our own backend or `localStorage` data.
- The frontend check is only for user experience. It never replaces backend validation.

### Do not
- Do not store the same data in both TanStack Query and Zustand.

## Admin only: shadcn/ui and TanStack Table
- shadcn/ui components live in `src/components/ui/` and may be imported only from `src/pages/admin/**` and `src/components/admin/**`. Customer pages never import them.
- JavaScript setup: `components.json` has `"tsx": false`, so `npx shadcn@latest add <name>` writes `.jsx` files. The `@/` import alias is set in `jsconfig.json` and `vite.config.js`.
- Allowed components (add only when a page needs them): `button`, `input`, `label`, `textarea`, `select`, `switch`, `checkbox`, `table`, `badge`, `dialog`, `alert-dialog`, `dropdown-menu`, `sonner`. Ask before adding any other.
- The packages `shadcn add` installs for these (Radix packages, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`, `sonner`) and `@tanstack/react-table` are approved. No other new dependency without asking.
- Files in `components/ui/` are generated. Only small edits (for example a size). Never put business logic in them.
- Admin forms: React Hook Form + Zod + the shadcn `Input`, `Label`, `Select`, `Textarea`, `Switch`. Show field errors under each field.
- Admin tables: one shared `components/admin/DataTable.jsx` built on TanStack Table + the shadcn `Table`.
  - Paging and sorting happen on the server (`manualPagination: true`, `manualSorting: true`), because the catalog has 2,242 products. Never load all rows to the browser.
  - Page, sort and filters live in the URL query string, and the TanStack Query key uses them.
  - Columns are defined per page, for example `pages/admin/products/columns.jsx`.
- Server data: TanStack Query. Client state: Zustand. See "Data and state" below.
- API calls live in `src/services/`. Query hooks live in `src/hooks/`.
- Every screen that loads data shows three states: loading, empty, error.
- Forms: HTML validation for simple forms. React Hook Form + Zod for large forms.
- Make every page work at phone width first, then desktop. Admin pages may be desktop first but must not break on a phone.
- Accessibility: real `<button>` and `<a>`, labels on inputs, alt text on images, touch targets at least 44px.
- Do not put secrets in client code. Only `VITE_` variables reach the browser.
- Keep filters, sorting and page number in the URL query string so links can be shared.
- Product text is plain text. Never use `dangerouslySetInnerHTML`. The size chart is rendered from `sizeChart.headers` and `sizeChart.rows`, with the table scrolling sideways on phones (`overflow-x-auto`).
- Product images are remote URLs. Use `loading="lazy"` and set `width` and `height` from the data to avoid layout jumps.

## Self-check loop (UI work)
Do not stop after the first build. Check your own work:
1. Compare the result with the reference: the images in `design/` (see `design/README.md`), else the spec. List every difference: layout, spacing, size, color, font, text, states.
2. Fix the differences one by one.
3. Check again. Repeat until the list is empty or only the user's choices remain.
4. If you can open the page (browser tool or Playwright), take screenshots at phone width (390px) and desktop width (1280px) after each round. If you cannot, say so and give the user a checklist instead. Never claim it matches without checking.
5. Report what you compared, what you fixed, and what is still different.
