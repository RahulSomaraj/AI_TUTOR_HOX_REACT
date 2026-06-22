# AI Tutor Admin Dashboard — Architecture, Security & Simplification Plan

**Date:** 2026-06-22
**Scope:** `src/` of the React 19 + Vite admin dashboard (~17k LOC, 18 pages, single `authService.js` API module)
**Goal:** Improve security and reduce complexity, weighted equally.

---

## 1. Current architecture (as-is)

```
src/
├── main.jsx / App.jsx          → BrowserRouter → AppRoutes
├── routes/
│   ├── AppRoutes.jsx           → all routes, single ProtectedRoute gate
│   └── ProtectedRoute.jsx      → checks localStorage token only
├── layout/AdminLayout.jsx      → Navbar + Sidebar + <Outlet/>
├── api/
│   ├── axiosInstance.js        → baseURL, token interceptor, 401 refresh queue
│   └── authService.js          → 504 lines, ~90 endpoint functions (all domains)
├── components/                 → Navbar, Sidebar, Attendance/*, Dashboard/*, shared
└── pages/                      → 18 page components, 400–1,240 lines each
```

**Stack:** React 19, react-router-dom 7, axios, TailwindCSS, lucide-react. No state-management library, no form/validation library, no test framework, no TypeScript.

**Data flow:** Page component → calls a function in `authService.js` → `axiosInstance` attaches `Bearer` token from `localStorage` → backend REST API. Token refresh is handled centrally in the response interceptor with a request queue (this part is well done).

### What's already good
- Centralized axios instance with request/response interceptors.
- Single-flight refresh with a pending-request queue and `_retry` guard — avoids infinite loops and refresh stampedes.
- Clean route nesting (`ProtectedRoute` → `AdminLayout` → pages).
- Consistent service-function naming; pages don't import axios directly.
- `.env` is git-ignored; no secrets committed.

---

## 2. Security findings

Ordered by severity. Severity reflects impact × likelihood for an internal admin tool.

### S1 — Tokens stored in `localStorage` (High)
Access **and** refresh tokens live in `localStorage` (`authService.js`, `axiosInstance.js`, `Navbar.jsx`). Any XSS — a single malicious dependency, a reflected field, a compromised CDN — can read both tokens and exfiltrate a full session. `localStorage` is readable by all JS on the origin and persists indefinitely.

**Recommendation (in priority order):**
1. **Best:** move to **httpOnly, Secure, SameSite=Strict cookies** issued by the backend. The browser sends them automatically; JS cannot read them; set `withCredentials: true` on axios. This neutralizes token theft via XSS. Requires backend CORS + CSRF coordination (see S2).
2. **If backend cookies aren't feasible short-term:** keep the **access token in memory only** (React context / module variable) and the refresh token in an httpOnly cookie. Access token dies on refresh, limiting the theft window.
3. **Minimum stopgap:** shorten access-token TTL and stop persisting `adminUser` profile data in `localStorage` (re-fetch from `/my-profile` instead).

### S2 — No CSRF protection path (Medium, becomes relevant with cookies)
There is no CSRF handling today because auth rides in a header (header auth is not CSRF-vulnerable). If you adopt cookie auth (S1), you **must** add CSRF defense: `SameSite=Strict` cookies plus a double-submit CSRF token or per-session token header. Plan these together.

### S3 — Client-side-only route protection (Medium)
`ProtectedRoute` only checks for the *presence* of a token string in `localStorage` — it never validates it. A user can paste any non-empty value and reach the admin shell (data calls would 401, but protected UI renders, leaking layout/structure and any cached data). There is also **no role/permission gating**: every authenticated user gets every page, even though the API clearly distinguishes `ADMIN`, `TEACHER`, etc.

**Recommendation:** treat the client gate as UX only (real enforcement is the API). Add (a) lightweight token sanity/expiry check (decode JWT `exp`), and (b) a role-aware guard so teacher/admin routes differ. Centralize auth state in an `AuthContext` rather than reading `localStorage` in scattered places.

### S4 — Inconsistent error handling / info leakage via `console` (Low–Medium)
25 `console.*` calls remain, several logging payloads and responses (`createStudent`, `fetchBoards`, `fetchSyllabusByGrade`). These ship to production bundles and can leak PII (student data) to the browser console. Remove them or gate behind a `if (import.meta.env.DEV)` logger.

### S5 — No input validation / sanitization layer (Low for now)
No validation library; forms validate ad-hoc (e.g. login just trims). No `dangerouslySetInnerHTML` exists today (good — no direct XSS sink), but topic/concept content and file uploads flow to the backend unvalidated from the client. Add schema validation at form boundaries (see C3) so malformed data never leaves the client and error states are consistent.

### S6 — `VITE_API_TIMEOUT_MS` / env robustness (Low)
`Number(import.meta.env.VITE_API_TIMEOUT_MS)` yields `NaN` if unset, which axios treats as "no timeout." Add a fallback (`|| 30000`) and ship a committed **`.env.example`** documenting required vars — currently none exists, so onboarding/misconfiguration risk is real.

---

## 3. Complexity findings

### C1 — Giant page components (High complexity cost)
The 10 largest pages are 700–1,240 lines each and hold 24–42 `useState` hooks apiece (`ClassesPage` has 42). Each page re-implements: data fetching, pagination, search/filter, modal open/close, create/edit/delete handlers, and response-shape normalization. This is the single biggest maintainability problem.

**Recommendation:** extract three reusable layers:
- **Data hooks** — `useResource(service, params)` returning `{ data, pagination, loading, error, refetch }`. Replaces the repeated fetch + `useEffect` + loading/error `useState` blocks (115 `useEffect`s, 96 `try/catch`es across the app today).
- **CRUD UI primitives** — a generic `<DataTable>`, `<Modal>`, `<ConfirmDialog>`, `<FormField>`. The 8 `window.confirm`/`alert` calls and per-page modal state collapse into these.
- **Page = config + columns**, not 1,000 lines of imperative wiring.

Target: pages drop from ~900 to ~150–250 lines.

### C2 — Duplicated normalization helpers (High, easy win)
`extractList` (5 copies), `extractPagination` (9 copies), `safeId`/`mapBoard` (4+ copies) are pasted across pages — each is dozens of lines defending against an inconsistent backend response shape. This is duplication *and* a symptom: the API returns data in many shapes (`data`, `data.data`, `data.<key>`, `pagination` vs `meta`).

**Recommendation:** move these into one `src/api/normalize.js`. Better still, normalize **once** in the axios response interceptor (or per-service) so pages always receive a predictable `{ items, pagination }` and the defensive code disappears entirely.

### C3 — Monolithic `authService.js` (Medium)
504 lines mixing auth, users, schools, subjects, textbooks, chapters, topics, syllabus, banners, attendance, notifications, parents. Hard to navigate and to reason about access scope.

**Recommendation:** split by domain into `src/api/services/{auth,catalog,users,attendance,...}.js` sharing one `axiosInstance`. Optionally generate a typed client later. Keep `uploadFile`'s multiple-fallback response parsing — but isolate it.

### C4 — No shared form / validation / toast layer (Medium)
Forms, error banners, and confirmations are reinvented per page. Inconsistent UX and lots of boilerplate.

**Recommendation:** adopt `react-hook-form` + `zod` (zod also doubles as the S5 validation/sanitization boundary), and a single toast/notification component to replace native `alert`/`confirm`.

### C5 — No tests, no TypeScript, no error boundary (Medium, foundational)
Zero test framework and no top-level React error boundary means refactors are risky and a single render error blanks the app. `react-hooks` is even listed as a runtime dependency by mistake (should be the dev plugin only).

**Recommendation:** add a root `<ErrorBoundary>`, introduce Vitest + React Testing Library for the new hooks/components, and consider an incremental TypeScript migration (start with the API layer, where shape bugs live). Clean up `package.json` deps.

---

## 4. Target architecture (to-be)

```
src/
├── app/                  AuthContext, ErrorBoundary, providers
├── api/
│   ├── axiosInstance.js  + normalize response shape here
│   ├── normalize.js      single extractList/extractPagination
│   └── services/         auth.js, users.js, catalog.js, attendance.js, ...
├── hooks/                useResource, useCrud, useDebouncedSearch
├── components/ui/        DataTable, Modal, ConfirmDialog, FormField, Toast, Pagination
├── features/<domain>/    page = columns + config + hook calls (150–250 lines)
├── routes/               ProtectedRoute (token-validating) + RoleRoute
└── lib/                  logger (DEV-gated), validation schemas (zod)
```

Auth state flows from a single `AuthContext` (token in memory or httpOnly cookie), not from scattered `localStorage` reads.

---

## 5. Prioritized roadmap

**Phase 0 — Quick wins (≈1 day, low risk)**
- Add `.env.example` + timeout fallback (S6).
- Strip/limit `console.*`; add DEV-gated logger (S4).
- Fix `package.json` (`react-hooks` misplacement) (C5).
- Add a root `<ErrorBoundary>` (C5).

**Phase 1 — De-duplicate (≈2–3 days, medium risk, high payoff)**
- Centralize `extractList`/`extractPagination`/`safeId` in `api/normalize.js` and normalize in the interceptor (C2).
- Split `authService.js` into domain services (C3).
- Build `useResource` hook + `<DataTable>`/`<Modal>`/`<ConfirmDialog>` and migrate 2 pages as a proof of concept (C1).

**Phase 2 — Security hardening (≈3–5 days, needs backend coordination)**
- Move tokens to httpOnly cookies (or memory + httpOnly refresh) and add CSRF (S1, S2).
- `AuthContext` + token-validating `ProtectedRoute` + role-based routes (S3).
- Add `zod` schemas at form boundaries (S5/C4).

**Phase 3 — Roll-out & safety net (ongoing)**
- Migrate remaining pages onto the shared hooks/components (C1, C4).
- Introduce Vitest + RTL; test the API/hook layer first (C5).
- Optional incremental TypeScript starting at `api/` (C5).

---

## 6. Effort vs. impact summary

| Item | Type | Effort | Impact | Priority |
|------|------|--------|--------|----------|
| S1 Token storage → httpOnly | Security | M–L | High | P1 |
| S3 Route/role enforcement + AuthContext | Both | M | High | P1 |
| C2 De-dup normalization helpers | Complexity | S | High | P1 |
| C1 Shared hooks + table/modal primitives | Complexity | L | High | P1 |
| C3 Split authService by domain | Complexity | M | Med | P2 |
| S4 Remove console / DEV logger | Security | S | Med | P0 |
| C4 react-hook-form + zod + toasts | Both | M | Med | P2 |
| S6 `.env.example` + timeout fallback | Security | S | Med | P0 |
| C5 ErrorBoundary / tests / TS | Foundation | M–L | Med | P2–3 |
| S2 CSRF (with cookie move) | Security | M | Med | P1 (paired w/ S1) |

S = small (<1d), M = medium (1–3d), L = large (3d+).

---

## 7. Key principle

Most of the security risk (S1, S3) and most of the complexity (C1, C2) reinforce each other: scattered `localStorage` access *is* both a security smell and a coupling smell. Centralizing auth state and the API/data layer fixes both at once. Start with the de-duplication and `AuthContext` work in Phase 1 — it pays down complexity immediately and creates the seam needed for the Phase 2 token-storage change.
