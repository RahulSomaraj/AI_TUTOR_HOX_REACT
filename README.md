# AiTutor — Admin Dashboard

A React single-page admin dashboard for the **AiTutor** platform. It gives administrators a
central place to manage the academic catalog (education boards, classes/grades, subjects,
syllabus, textbooks, chapters, topics) and the people around it (schools, teachers, parents,
students), plus supporting features like attendance, banners, and push notifications.

The app is a pure front-end client. All data comes from the AiTutor REST API
(`https://uatai.hoxinfotech.com`); this repository contains no backend code.

---

## Tech Stack

| Concern            | Choice                                                   |
| ------------------ | -------------------------------------------------------- |
| Framework          | [React 19](https://react.dev)                            |
| Build tool / dev   | [Vite 8](https://vite.dev)                               |
| Routing            | [react-router-dom 7](https://reactrouter.com)            |
| HTTP client        | [axios](https://axios-http.com)                          |
| Styling            | [Tailwind CSS 3](https://tailwindcss.com) (utility-first)|
| Icons              | [lucide-react](https://lucide.dev)                       |
| Linting            | ESLint 9 (flat config)                                   |

There is **no TypeScript** and **no global state library** (Redux/Zustand/Context) — each page
owns its own state with React hooks, and the auth token lives in `localStorage`.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Install & run

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server (default: http://localhost:5173)
```

### Other scripts

```bash
npm run build     # production build → dist/
npm run preview   # serve the production build locally
npm run lint      # run ESLint over the project
```

### Configuration

The API base URL is currently **hard-coded** in two places:

- [src/api/axiosInstance.js](src/api/axiosInstance.js) — `BASE_URL`
- [src/api/authService.js](src/api/authService.js) — `BASE_URL` (used only by the raw refresh call)

> ⚠️ There is no `.env` file yet. If you point this at a different environment, update the
> constant in both files. Migrating this to a Vite env variable (`import.meta.env.VITE_API_URL`)
> is a good first improvement.

---

## Project Structure

```
AI_TUTOR_HOX_REACT/
├── index.html                 # HTML entry; loads the Harabara Mais Demo brand font
├── vite.config.js             # Vite + React plugin
├── tailwind.config.js         # Tailwind content paths
├── postcss.config.js          # Tailwind + autoprefixer
├── eslint.config.js           # ESLint flat config
└── src/
    ├── main.jsx               # React entry — mounts <App/> into #root
    ├── App.jsx                # Wraps routes in <BrowserRouter>
    ├── index.css              # Tailwind directives (base/components/utilities)
    │
    ├── api/
    │   ├── axiosInstance.js   # Configured axios client: auth header + token refresh
    │   └── authService.js     # ALL API calls live here (login + every CRUD function)
    │
    ├── routes/
    │   ├── AppRoutes.jsx       # Route table (public /login + protected app routes)
    │   └── ProtectedRoute.jsx  # Redirects to /login when no accessToken is present
    │
    ├── layout/
    │   └── AdminLayout.jsx     # Sidebar + Navbar shell around an <Outlet/>
    │
    ├── components/
    │   ├── Sidebar/Sidebar.jsx     # Left nav menu
    │   ├── Navbar/Navbar.jsx       # Top bar: profile menu + logout
    │   ├── Dashboard/              # StatCard, QuickActions, UpcomingTasks
    │   └── Attendance/             # Modal, calendar, filters, header, stats, table
    │
    ├── pages/                  # One component per screen (see “Pages” below)
    └── assets/                 # favicon.svg
```

---

## Architecture

### Entry & rendering
`main.jsx` mounts `<App/>` in `<StrictMode>`. `App.jsx` provides the router and delegates to
`AppRoutes`.

### Routing & the protected shell
Routes are declared in [src/routes/AppRoutes.jsx](src/routes/AppRoutes.jsx):

- `/login` is **public**.
- Everything else is nested under `<ProtectedRoute>` → `<AdminLayout>`.
  - `ProtectedRoute` checks for an `accessToken` in `localStorage`; if missing, it redirects to
    `/login`.
  - `AdminLayout` renders the persistent `Sidebar` + `Navbar` and an `<Outlet/>` for the active
    page.
- Any unknown path redirects to `/` (`<Navigate to="/" replace />`).

Some routes are **nested/hierarchical** and carry URL params, reflecting the catalog hierarchy:

```
Education Board → Grades → Syllabus (Textbooks) → Chapters → Topics → Topic detail
```

| Path | Page |
| ---- | ---- |
| `/` | Dashboard |
| `/education-boards` | EducationBoardsPage |
| `/education-boards/:boardId/grades` | BoardGradesPage |
| `/classes` | ClassesPage |
| `/schools` | SchoolsPage |
| `/syllabus` | TextbooksPage |
| `/syllabus/:textbookId/chapters` | ChaptersPage |
| `/syllabus/:textbookId/chapters/:chapterId/topics` | TopicsPage |
| `/syllabus/:textbookId/chapters/:chapterId/topics/:topicId` | TopicDetailPage |
| `/subjects` | SubjectsPage |
| `/teachers` | TeachersPage |
| `/parents` | ParentsPage |
| `/students` | StudentsPage |
| `/attendance` | AttendancePage |
| `/banner` | BannerPage |
| `/notifications` | NotificationsPage |

> Note: `src/pages/SyllabusPage.jsx` exists in the repo but is **not currently routed** —
> the `/syllabus` path maps to `TextbooksPage`. Treat `SyllabusPage.jsx` as unused/legacy
> until wired up.

### API layer

All network access is centralized. **Do not call `axios` directly from a component** — add a
function to `authService.js` and import it.

- **[src/api/axiosInstance.js](src/api/axiosInstance.js)** — a pre-configured axios instance:
  - `baseURL` + `10s` timeout + JSON headers.
  - **Request interceptor**: attaches `Authorization: Bearer <accessToken>` from `localStorage`
    to every request.
  - **Response interceptor**: on a `401`, transparently calls `/refresh-token`, stores the new
    token, and **replays the failed request** — the caller never sees the refresh. Concurrent
    requests that 401 while a refresh is in flight are queued (`pendingRequests`) and replayed
    together. If the refresh itself fails, the session is cleared and the user is sent to
    `/login`.

- **[src/api/authService.js](src/api/authService.js)** — every API call the app makes, grouped by
  domain (auth, grades, schools, subjects, textbooks, chapters, topics, syllabus, students,
  boards, board-grades, classes, teachers, notifications, parents, banners, attendance, file
  upload). Functions follow a consistent shape:

  ```js
  export async function fetchSubjects(params = {}) {
    const { data } = await api.get("/subject", { params });
    return data;
  }
  ```

### Authentication flow

1. `LoginPage` collects username/password and calls `loginAndGetToken()`.
2. On success the service stores three keys in `localStorage`:
   - `accessToken` — bearer token (the `Bearer ` prefix is stripped before storing)
   - `refreshToken` — used to silently renew the access token
   - `adminUser` — `{ name, role, avatar }` for the Navbar profile
3. `ProtectedRoute` gates the app on the presence of `accessToken`.
4. `Navbar` reads `adminUser` for the profile display and clears tokens on **Logout**.
5. Token expiry is handled automatically by the axios response interceptor (see above).

### Styling & branding

- Tailwind utility classes are used inline throughout; there are essentially no custom CSS files
  beyond the Tailwind directives in `index.css`.
- Brand color is the teal `#235A6E` / `#1f6573` family.
- The "AiTutor" wordmark uses the **Harabara Mais Demo** font, loaded via a `<link>` in
  `index.html`.
- Icons come from `lucide-react`.

---

## Pages

Each file in `src/pages/` is one screen. Most catalog pages are self-contained CRUD screens that
follow the same recipe: fetch a list, render a searchable/paginated table, and manage
create/edit/delete through modals — all driven by the corresponding `authService` functions.

| Page | Purpose |
| ---- | ------- |
| `Dashboard.jsx` | Landing screen with stat cards, quick actions, and upcoming tasks (currently uses static demo numbers). |
| `loginPage.jsx` | Login form; also shows (non-functional) Google/Microsoft/Register UI. |
| `EducationBoardsPage.jsx` | CRUD for education boards; drills into a board's grades. |
| `BoardGradesPage.jsx` | Manage the grades attached to a specific board. |
| `ClassesPage.jsx` | CRUD for classes/grades. |
| `SchoolsPage.jsx` | CRUD for schools. |
| `TextbooksPage.jsx` | CRUD for textbooks (mounted at `/syllabus`). |
| `ChaptersPage.jsx` | Chapters within a textbook. |
| `TopicsPage.jsx` | Topics within a chapter. |
| `TopicDetailPage.jsx` | A single topic's detail, including quiz/practice content. |
| `SubjectsPage.jsx` | CRUD for subjects. |
| `TeachersPage.jsx` | CRUD for teachers (admin users of type `TEACHER`). |
| `ParentsPage.jsx` | CRUD for parents and their linked students. |
| `StudentsPage.jsx` | CRUD for students. |
| `AttendancePage.jsx` | Attendance tracking (uses the `components/Attendance/*` widgets). |
| `BannerPage.jsx` | Manage promotional banners (supports file upload). |
| `NotificationsPage.jsx` | Compose/send and list push notifications. |
| `SyllabusPage.jsx` | Legacy/unused — not currently routed. |

### Common CRUD-page pattern

Pages like `EducationBoardsPage.jsx` illustrate the shared conventions worth knowing before
touching a new page:

- **Defensive response parsing.** API list responses vary in shape, so pages use helpers such as
  `extractBoards(response)` and `extractPagination(...)` that check several possible keys
  (`response.data`, `response.data.data`, `response.data.boards`, `response.pagination`,
  `response.meta`, …). Reuse this pattern when adding a page.
- **Local state only.** `useState`/`useEffect`/`useMemo` hold the list, loading/error flags,
  search text, pagination, and modal open/edit state. There is no shared store.
- **Modals for create/edit/delete**, driven by the `create*`/`update*`/`delete*` service calls.

---

## Conventions & Notes for New Developers

- **Add API calls in one place.** New endpoints go in `authService.js`; components import named
  functions from it rather than using `axios` directly.
- **Auth is `localStorage`-based.** Reading `accessToken` / `refreshToken` / `adminUser` directly
  from `localStorage` is the established pattern. Token refresh is automatic — you generally
  don't need to handle 401s manually.
- **Styling is inline Tailwind.** Match the existing utility-class style and the teal brand
  palette rather than introducing CSS modules or a component library.
- **Icons** come from `lucide-react`; import the specific icon you need.
- **Linting**: `no-unused-vars` is enforced (variables starting with a capital or `_` are
  ignored). Run `npm run lint` before committing.
- **Console logs**: a few `console.log` calls remain in `authService.js` and some pages — clean
  these up as you touch the code.

### Known rough edges / good first improvements
- Move the hard-coded `BASE_URL` into a Vite env variable.
- Dashboard stats are static placeholders — wire them to real endpoints.
- `SyllabusPage.jsx` is unused; either route it or remove it.
- Login page's social/Register buttons are UI-only (no handlers).
- Navbar's notification badge count (`6`) is hard-coded.
</content>
</invoke>
