# Frontend Architecture & Conventions

A quick guide to the structure introduced in the security + simplification refactor.
Read this before adding a new page or component.

## Layout

```
src/
├── app/            AuthContext, providers (TanStack Query), ErrorBoundary
├── api/
│   ├── axiosInstance.js   token attach + 401 refresh queue
│   ├── normalize.js       extractList / extractPagination / safeId
│   ├── authService.js     compatibility barrel (re-exports services/*)
│   └── services/          auth.js, catalog.js (domain-split API calls)
├── components/ui/  Modal, ConfirmDialog, DataTable, PageHeader,
│                   SearchInput, SearchableSelect, ActionMenu
├── hooks/          useDebounce, useOutsideClick
├── features/       per-domain Query hooks (e.g. subjects/useSubjects.js)
├── lib/            session.js (token storage), logger.js (DEV-gated)
├── layout/         AdminLayout (responsive shell)
└── pages/          one component per route
```

## State, in one sentence each

- **Server data** (lists, records) → TanStack Query (`useQuery`/`useMutation`), see `features/subjects/useSubjects.js` for the template.
- **Auth/session** → `useAuth()` from `app/AuthContext`; never read `localStorage` directly — go through `lib/session.js`.
- **App-wide UI** → small context (none needed yet).
- **Local UI** (modal open, search text, current page) → component `useState`.

## The UI kit

| Component | Props | Use for |
|-----------|-------|---------|
| `PageHeader` | `{title, subtitle, actionLabel, onAction}` | page title + primary button |
| `SearchInput` | `{value, onChange(str), placeholder}` | search box (onChange gives a string) |
| `SearchableSelect` | `{value, onChange(opt), onSearch(q), options, loading, ...}` | async search dropdown; options are `{value,label}` |
| `DataTable` | `{columns, rows, loading, error, emptyLabel, rowKey, minWidth}` | tables; renders its own loading/error/empty states |
| `ActionMenu` | `{label, onEdit, onDelete, extraItems}` | row kebab menu |
| `ConfirmDialog` | `{title, message, confirmLabel, busy, tone, onCancel, onConfirm}` | delete/confirm prompts |
| `Modal` | `{title, onClose, children, footer, size, busy}` | generic modal shell |

`DataTable` columns: `[{ key, header, align?, render?(row) }]`.

## Adding a new CRUD page (recipe)

1. Add the API calls to the right `api/services/*.js` (or a new domain file); they're re-exported via `authService.js`.
2. (Optional but preferred) add a `features/<domain>/use<Domain>.js` Query hook like `useSubjects.js`.
3. Build the page: `PageHeader` + `SearchInput`/`SearchableSelect` filters + `DataTable` (with a `columns` array) + `ConfirmDialog` for deletes. Use `SubjectsPage.jsx` as the reference.
4. Register the route in `routes/AppRoutes.jsx` (inside the protected `AdminLayout`).

## Responsive shell

`AdminLayout` + `Sidebar` give a static sidebar at `lg+` and a drawer (hamburger in the Navbar) below `lg`. New pages get this for free. Keep wide tables inside `DataTable` (or an `overflow-x-auto` wrapper) so they scroll on mobile.

## Conventions

- No `console.*` in shipped code — use `lib/logger.js` (`logger.error` is always on; the rest are DEV-only).
- Import filenames with exact case (`Countrycodepicker`, `Datepickermodal`) — case-sensitive CI/Linux builds will break otherwise.
- Env vars live in `.env` (see `.env.example`); E2E credentials in `.env.e2e` (git-ignored). Tests: `npm run test:e2e` (see `E2E_TESTING.md`).

## Pages intentionally NOT on the kit

`AttendancePage` (composes sub-components), `TopicDetailPage` (detail view), `Dashboard` (stat grid), `loginPage` (auth) — the table/CRUD kit doesn't apply. Their edit modals could optionally be wrapped in `Modal` later for consistency.
