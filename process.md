# Building the AiTutor Admin Dashboard From Scratch

**A step-by-step guide for someone who just learned React basics.**

This document walks you through building the *entire* AiTutor admin dashboard from an empty
folder to the state the project is in today. It assumes you know only the fundamentals of React:
what a **component** is, what **JSX** looks like, and roughly what `useState` does. Everything
else is explained as we go.

Read it top to bottom the first time. Each part builds on the one before it, in the same order a
real developer would build this app.

> **What you'll have at the end:** a login screen, a protected admin area with a sidebar and top
> bar, and ~18 management pages (schools, students, teachers, subjects, syllabus, attendance,
> etc.) that talk to a REST API.

---

## Table of Contents

1. [Part 0 — Concepts you need first](#part-0--concepts-you-need-first)
2. [Part 1 — Create the project with Vite](#part-1--create-the-project-with-vite)
3. [Part 2 — Install the libraries we use](#part-2--install-the-libraries-we-use)
4. [Part 3 — Set up Tailwind CSS](#part-3--set-up-tailwind-css)
5. [Part 4 — The entry point (main.jsx & App.jsx)](#part-4--the-entry-point-mainjsx--appjsx)
6. [Part 5 — Routing: turning URLs into pages](#part-5--routing-turning-urls-into-pages)
7. [Part 6 — The layout shell (Sidebar + Navbar)](#part-6--the-layout-shell-sidebar--navbar)
8. [Part 7 — The API layer (axios + services)](#part-7--the-api-layer-axios--services)
9. [Part 8 — Authentication (login, tokens, protecting routes)](#part-8--authentication-login-tokens-protecting-routes)
10. [Part 9 — Your first CRUD page (the master pattern)](#part-9--your-first-crud-page-the-master-pattern)
11. [Part 10 — Repeating the pattern & nested routes](#part-10--repeating-the-pattern--nested-routes)
12. [Part 11 — The Dashboard](#part-11--the-dashboard)
13. [Part 12 — The Attendance feature](#part-12--the-attendance-feature)
14. [Part 13 — Banners & Notifications (file upload)](#part-13--banners--notifications-file-upload)
15. [Part 14 — Running, building, and linting](#part-14--running-building-and-linting)
16. [Glossary & where to go next](#glossary--where-to-go-next)

---

## Part 0 — Concepts you need first

Before writing a single file, make sure these four ideas are clear. The whole app is built out of
them.

### 1. A component is a function that returns JSX
```jsx
function Hello() {
  return <h1>Hello</h1>;
}
```
Every screen and every reusable piece of UI in this project is a function like this. Files that
contain components end in `.jsx`.

### 2. Props are the inputs to a component
A parent passes data down to a child through props:
```jsx
function StatCard({ title, value }) {   // <- props come in here
  return <p>{title}: {value}</p>;
}

// used like:
<StatCard title="Students" value={120} />
```

### 3. State is data that changes over time
`useState` gives a component a value plus a function to change it. Changing it re-renders the
component:
```jsx
const [count, setCount] = useState(0);   // count starts at 0
setCount(count + 1);                       // re-renders with the new value
```
We use state for form inputs, loading spinners, whether a modal is open, the current page number,
and so on.

### 4. `useEffect` runs code *after* render (for side effects)
Fetching data from a server is a "side effect." We do it inside `useEffect` so it happens after
the component appears on screen:
```jsx
useEffect(() => {
  // fetch data here
}, []);   // [] means "run once, when the component first mounts"
```

> **If any of these four are fuzzy, pause here** and review them. Parts 7–9 lean on all of them
> at the same time.

We also use a few tools that are *not* plain React. You don't need to know them yet — each gets
introduced at the moment we first need it:
- **Vite** – the tool that runs the dev server and builds the app.
- **React Router** – shows different pages for different URLs.
- **axios** – makes HTTP requests to the backend.
- **Tailwind CSS** – styling by adding utility class names like `flex`, `p-4`, `text-white`.
- **lucide-react** – a set of ready-made icons.

---

## Part 1 — Create the project with Vite

**Vite** scaffolds a React project and gives us a fast dev server with hot reload (your changes
appear in the browser instantly).

### Step 1.1 — Install Node.js
Download and install **Node.js 18 or newer** from [nodejs.org](https://nodejs.org). This also
installs `npm` (the package manager we use to install libraries). Verify:
```bash
node -v
npm -v
```

### Step 1.2 — Scaffold a React app
In the folder where you keep your projects, run:
```bash
npm create vite@latest ai-tutor-admin-dashboard -- --template react
cd ai-tutor-admin-dashboard
npm install
```
- `--template react` gives us plain React with JavaScript (not TypeScript — this project does not
  use TypeScript).
- `npm install` downloads the base dependencies into `node_modules/`.

### Step 1.3 — Look at what Vite gave you
You now have roughly:
```
index.html          <- the single HTML page the whole app loads into
package.json        <- lists dependencies and scripts (dev/build/lint)
vite.config.js      <- Vite configuration
src/
├── main.jsx        <- the JavaScript entry point
├── App.jsx         <- the root component
└── index.css       <- global styles
```

The important idea: **`index.html` contains one empty `<div id="root">`**. React takes over that
div and renders everything inside it. Open `index.html` and you'll see near the bottom:
```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

In this project `index.html` was also edited to set the page title and load the brand font:
```html
<title>AiTutor</title>
<link href="https://fonts.cdnfonts.com/css/harabara-mais-demo" rel="stylesheet">
```
The "Harabara Mais Demo" font is what makes the "AiTutor" wordmark look distinctive.

### Step 1.4 — Run it
```bash
npm run dev
```
Open the URL it prints (usually `http://localhost:5173`). You'll see the Vite starter page. Now
we start replacing that with our app.

### Step 1.5 — Clean the boilerplate
Delete the demo content Vite created so we have a blank slate:
- Empty out `src/App.jsx` down to a minimal component.
- Replace `src/index.css` (we'll fill it with Tailwind in Part 3).
- Delete `src/App.css` and the demo `assets` if present.

---

## Part 2 — Install the libraries we use

Run these installs. Each one is explained below so you know *why* it's here.

```bash
npm install react-router-dom axios lucide-react
```

| Package | What it does | Where you'll see it |
| ------- | ------------ | ------------------- |
| `react-router-dom` | Shows different components for different URLs (`/login`, `/students`, …) | Part 5, 8, 10 |
| `axios` | A friendly wrapper for making HTTP requests to the backend | Part 7 |
| `lucide-react` | Ready-made SVG icons (`<Bell/>`, `<Search/>`, `<Trash2/>`, …) | Everywhere |

> **Heads-up:** the real `package.json` also lists a package called `react-hooks`. That was added
> by mistake and isn't actually used — you can ignore it. The linting plugin you *do* want is
> `eslint-plugin-react-hooks` (a dev dependency, installed in Part 14).

Tailwind is installed separately in the next part because it needs extra setup.

---

## Part 3 — Set up Tailwind CSS

We style everything with **Tailwind**: instead of writing CSS files, we add small utility classes
directly on elements (`className="flex items-center gap-2 p-4"`). This is the single most common
thing you'll do in every component, so set it up carefully.

### Step 3.1 — Install Tailwind and its build tools
```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```
The `-p` flag also creates a `postcss.config.js`. (This project uses Tailwind **v3**.)

### Step 3.2 — Tell Tailwind which files to scan
Tailwind only generates CSS for classes it actually sees. Point it at your source files in
`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
```

`postcss.config.js` just wires Tailwind and autoprefixer together:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 3.3 — Import Tailwind's styles
Replace the entire contents of `src/index.css` with just the three Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
That's the whole stylesheet for the app. There are essentially **no hand-written CSS rules** in
this project — all styling is Tailwind utility classes on elements.

### Step 3.4 — Confirm it works
Put a Tailwind class in `App.jsx` (`<h1 className="text-3xl text-teal-700">AiTutor</h1>`), run
`npm run dev`, and check the styling applies. If it does, Tailwind is wired up correctly.

> **The brand color** used throughout is a teal, written as hex values like `#235A6E`,
> `#1f6573`, and `#155966`. You'll see these repeatedly in `className` strings using Tailwind's
> "arbitrary value" syntax, e.g. `bg-[#155966]` or `text-[#235A6E]`.

---

## Part 4 — The entry point (main.jsx & App.jsx)

Now we connect React to that empty `<div id="root">`.

### `src/main.jsx` — hand the root div to React
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'          // load Tailwind
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```
- `createRoot(...).render(...)` tells React: "render `<App/>` inside `#root`."
- `import './index.css'` is how Tailwind's styles get loaded.
- `<StrictMode>` is a development helper that surfaces bugs early. (It also runs certain code
  twice in dev — that's expected and not a problem.)

### `src/App.jsx` — the top of the tree
`App` doesn't render pages directly. Its only job is to turn on the router:
```jsx
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
```
`BrowserRouter` is what lets the app respond to the URL in the address bar. Everything inside it
can use routing features. We haven't built `AppRoutes` yet — that's next.

---

## Part 5 — Routing: turning URLs into pages

**Goal:** when the URL is `/login` show the login screen; when it's `/students` show the students
page; and so on.

Create a `src/routes/` folder. The route table lives in `src/routes/AppRoutes.jsx`.

### Step 5.1 — The three routing building blocks
- `<Routes>` – a container that picks *one* matching route.
- `<Route path="..." element={<Something/>} />` – "when the URL is this path, show this element."
- `<Navigate to="..." />` – redirect to another URL.

### Step 5.2 — Start simple
Begin with just a login page and a home page to prove routing works:
```jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/loginPage";
import Dashboard from "../pages/Dashboard";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
```
The last route (`path="*"`) is a catch-all: any unknown URL redirects home.

> We'll come back and expand this file heavily in Parts 8 and 10 once we have a layout and
> authentication. For now, just understand the shape: a list of `<Route>`s inside `<Routes>`.

Create placeholder page components in `src/pages/` (e.g. `Dashboard.jsx`, `loginPage.jsx`) that
each return a simple `<div>` for now, so the imports resolve. We'll flesh them out later.

---

## Part 6 — The layout shell (Sidebar + Navbar)

Every screen except login shares the same frame: a **sidebar** on the left and a **top navbar**,
with the page content in the middle. We build that frame once and reuse it.

### Step 6.1 — The layout component
`src/layout/AdminLayout.jsx` arranges the pieces:
```jsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

const AdminLayout = () => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-4 overflow-y-auto">
          <Outlet />   {/* the active page renders here */}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
```

> **The key new concept: `<Outlet/>`.** When you nest routes inside a layout route (we'll do this
> in Part 8), React Router renders the child page *wherever you put `<Outlet/>`*. So the sidebar
> and navbar stay fixed while only the middle swaps between Dashboard, Students, etc.

### Step 6.2 — The Sidebar
`src/components/Sidebar/Sidebar.jsx` is a list of navigation buttons. The pattern worth learning:
**define the menu as data, then map over it** instead of writing each button by hand.
```jsx
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, School, BookOpen, /* ...more icons */ } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Schools",   icon: School,          path: "/schools" },
  { label: "Classes",   icon: BookOpen,        path: "/classes" },
  // ...one entry per page
];

export default function Sidebar() {
  const navigate = useNavigate();     // lets us change the URL on click
  const location = useLocation();     // tells us the current URL (to highlight the active item)

  return (
    <aside className="w-[230px] h-screen bg-white ...">
      {navItems.map(({ label, icon: Icon, path }) => {
        const isActive = location.pathname === path;
        return (
          <button key={label} onClick={() => navigate(path)}
                  className={isActive ? "bg-[#23616E] text-white" : "..."}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        );
      })}
    </aside>
  );
}
```
- `useNavigate()` returns a `navigate` function — calling `navigate("/schools")` changes the URL,
  which makes the router show that page.
- `useLocation()` gives the current path so we can highlight whichever button matches.

The real file has 12 menu items (Dashboard, Education Boards, Schools, Classes, Syllabus,
Teachers, Parents, Students, Attendance, Subjects, Banner, Notifications) and slightly fancier
active-state logic, but the idea is exactly the above.

### Step 6.3 — The Navbar
`src/components/Navbar/Navbar.jsx` is the top bar. It shows a notification bell, the logged-in
admin's name/avatar, and a dropdown with a **Logout** button. Two things to notice:

1. It reads the logged-in user from the browser's `localStorage` (we save it there at login in
   Part 8):
   ```jsx
   const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
   ```
2. **Logout** clears the saved tokens and sends the user back to `/login`:
   ```jsx
   function handleLogout() {
     localStorage.removeItem("accessToken");
     localStorage.removeItem("adminUser");
     navigate("/login", { replace: true });
   }
   ```
It also uses local state (`useState`) to toggle the dropdown open/closed and to show a "Are you
sure you want to logout?" confirmation modal.

---

## Part 7 — The API layer (axios + services)

This is the heart of the app. Every page gets its data from a backend REST API at
`https://uatai.hoxinfotech.com`. We centralize **all** network code in two files so pages never
touch `axios` directly.

### Step 7.1 — A configured axios client
`src/api/axiosInstance.js` creates one axios instance the whole app shares:
```js
import axios from "axios";

const BASE_URL = "https://uatai.hoxinfotech.com";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});
```
Because `baseURL` is set, a call like `api.get("/subject")` really hits
`https://uatai.hoxinfotech.com/subject`.

> **Beginner note:** `BASE_URL` is hard-coded here (and again in the auth service). A common
> first improvement is moving it to a Vite environment variable (`import.meta.env.VITE_API_URL`),
> but the current project keeps it inline — so this guide does too.

### Step 7.2 — Interceptors: the clever part

An **interceptor** is code axios runs automatically on every request or every response. We use two.

**Request interceptor — attach the login token to every call.** After you log in, the backend
expects an `Authorization: Bearer <token>` header on protected requests. Rather than adding it
manually everywhere, we add it once:
```js
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Response interceptor — silently refresh an expired token.** Access tokens expire. When a call
comes back with HTTP `401 Unauthorized`, instead of kicking the user out, we:
1. call `/refresh-token` to get a fresh access token,
2. save it,
3. **replay the original request** with the new token — so the page never even notices.

The tricky detail this file handles well: if *many* requests fail with 401 at the same moment, we
must only refresh **once** and make the others wait. That's what the `isRefreshing` flag and the
`pendingRequests` queue do:
```js
let isRefreshing = false;
let pendingRequests = [];   // requests waiting for the new token

axiosInstance.interceptors.response.use(
  (response) => response,           // success: pass through untouched
  async (error) => {
    const original = error.config;
    const is401 = error.response?.status === 401;

    // Don't try to refresh if it wasn't a 401, if the failing call WAS the
    // refresh call, or if we already retried this request once.
    if (!is401 || original.url?.includes("/refresh-token") || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // A refresh is already happening — queue this request until it's done.
      return new Promise((resolve, reject) => pendingRequests.push({ resolve, reject }))
        .then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(original);
        });
    }

    original._retry = true;
    isRefreshing = true;
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      const { data } = await axios.post(`${BASE_URL}/refresh-token`, { refreshToken });
      const newToken = data.data.token.replace(/^Bearer\s+/i, "");
      localStorage.setItem("accessToken", newToken);
      // release all queued requests with the new token, then replay this one
      pendingRequests.forEach(({ resolve }) => resolve(newToken));
      pendingRequests = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return axiosInstance(original);
    } catch (refreshError) {
      // refresh failed → clear session and send to /login
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
```
Don't worry if this feels advanced — it *is*. The point for a beginner: **this file makes auth
"just work" for the rest of the app.** Pages call the API normally and never think about tokens or
expiry.

### Step 7.3 — The service file: one function per endpoint
`src/api/authService.js` holds **every** API call in the app, each as a small named function.
They all follow the same shape:
```js
import api from "./axiosInstance";

export async function fetchSubjects(params = {}) {
  const { data } = await api.get("/subject", { params });
  return data;
}
export async function createSubject(payload) {
  const { data } = await api.post("/subject", payload);
  return data;
}
export async function updateSubject(id, payload) {
  const { data } = await api.put(`/subject/${id}`, payload);
  return data;
}
export async function deleteSubject(id) {
  const { data } = await api.delete(`/subject/${id}`);
  return data;
}
```
There are ~90 of these, grouped by domain with comment headers: auth, grades/classes, schools,
subjects, textbooks, chapters, topics, syllabus, students (users), education boards, board-grades,
teachers, parents, notifications, banners, attendance, and a file upload helper.

> **The golden rule of this codebase:** a component **never** imports `axios`. It imports the
> function it needs from `authService.js`. When you add a new backend call, add it here first.

Two helpers in this file are worth calling out:
- `loginAndGetToken(username, password)` — logs in and saves the tokens (Part 8).
- `uploadFile(file)` — uploads a file as `multipart/form-data` and digs the returned URL out of
  whatever shape the server sends back (used by Banners, Part 13).

---

## Part 8 — Authentication (login, tokens, protecting routes)

Now we make the app require a login. Three pieces: the login page, saving the token, and a guard
that blocks the app when you're not logged in.

### Step 8.1 — The login service function
In `authService.js`, `loginAndGetToken` posts the credentials and, on success, saves three things
into `localStorage`:
```js
export async function loginAndGetToken(username, password) {
  const { data } = await api.post("/admin/login", { username, password });
  const cleanToken = data.data.token.replace(/^Bearer\s+/i, "");   // strip "Bearer " prefix

  localStorage.setItem("accessToken", cleanToken);
  if (data.data.refreshToken) localStorage.setItem("refreshToken", data.data.refreshToken);
  localStorage.setItem("adminUser", JSON.stringify({ /* name, role, avatar */ }));
  return cleanToken;
}
```
Why `localStorage`? It's simple storage in the browser that survives page refreshes. The request
interceptor (Part 7) reads `accessToken` from it on every call.

- `accessToken` — proves who you are on each request.
- `refreshToken` — used to get a new access token when the old one expires.
- `adminUser` — name/role/avatar for the navbar (so we don't refetch it constantly).

### Step 8.2 — The login page
`src/pages/loginPage.jsx` is a normal controlled form. The essentials:
```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAndGetToken } from "../api/authService";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();                 // stop the browser reloading the page
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    try {
      setLoading(true);
      await loginAndGetToken(username.trim(), password.trim());
      navigate("/", { replace: true }); // success → go to the dashboard
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="text-red-700">{error}</div>}
      <input value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
    </form>
  );
}
```
Learn this shape well — **it's the same shape every form in the app uses**: a piece of state per
field, a `loading` flag to disable the button while saving, and an `error` string to show
failures.

> The real page also has a show/hide password toggle and some non-functional Google/Microsoft/
> "Register" buttons that are UI-only placeholders.

### Step 8.3 — The route guard
`src/routes/ProtectedRoute.jsx` blocks the admin area unless a token exists:
```jsx
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    return <Navigate to="/login" replace />;  // not logged in → bounce to login
  }
  return <Outlet />;                            // logged in → render the child routes
}
```
This is a route that renders *either* a redirect *or* an `<Outlet/>` (its child routes). Simple
but effective.

> **Honest limitation:** this only checks that *some* token string exists — it doesn't validate
> it. Real security is enforced by the backend (protected API calls 401 without a valid token).
> The guard is really about UX: don't show the admin shell to someone who isn't logged in.

### Step 8.4 — Wire the guard into the routes
Now expand `AppRoutes.jsx` so that **login is public** and **everything else is nested inside the
guard and the layout**:
```jsx
<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />

  {/* Protected: must pass ProtectedRoute, then render inside AdminLayout */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AdminLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="schools" element={<SchoolsPage />} />
      {/* ...all other pages... */}
    </Route>
  </Route>

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```
Read the nesting from outside in: **guard → layout → page**. A request for `/schools` first checks
the token (`ProtectedRoute`), then draws the sidebar/navbar frame (`AdminLayout`), then renders
`SchoolsPage` into the layout's `<Outlet/>`. This is exactly why `AdminLayout` had an `<Outlet/>`
in Part 6.

---

## Part 9 — Your first CRUD page (the master pattern)

**CRUD** = Create, Read, Update, Delete. Most pages in this app are CRUD screens for one kind of
thing (schools, subjects, boards, …). They all follow one recipe. **Learn this recipe once and
you understand ~14 of the pages.** We'll use the Education Boards page as the worked example.

A CRUD page does five jobs:
1. **Read** a list from the API and show it in a table.
2. **Search** and **paginate** that list.
3. **Create** a new item via a modal form.
4. **Update** an existing item via the same modal.
5. **Delete** an item after a confirmation.

### Step 9.1 — The state a CRUD page holds
At the top of the component you declare state for each moving part:
```jsx
const [boards, setBoards]         = useState([]);     // the rows from the API
const [loading, setLoading]       = useState(true);   // show a spinner while fetching
const [error, setError]           = useState("");     // show a message if fetch fails
const [search, setSearch]         = useState("");     // the search box text
const [page, setPage]             = useState(1);      // current page number
const [limit, setLimit]           = useState(10);     // rows per page
const [pagination, setPagination] = useState({ /* totalPages, totalCount, ... */ });

// modal state
const [showAddModal, setShowAddModal] = useState(false);  // is the "add" form open?
const [editTarget, setEditTarget]     = useState(null);   // which row are we editing? (null = none)
const [deleteTarget, setDeleteTarget] = useState(null);   // which row are we deleting?
const [reloadKey, setReloadKey]       = useState(0);      // bump this to force a refetch
```

### Step 9.2 — Fetch the list in `useEffect`
When the page loads (and whenever the search/page changes), fetch data. Notice three professional
touches: a **debounce** (wait 350ms so we don't fire a request on every keystroke), a
**cancelled** flag (ignore results if the component unmounted), and building the query params with
`useMemo`:
```jsx
const queryParams = useMemo(
  () => ({ page, limit, order: "desc", name: search.trim() || undefined }),
  [page, limit, search]
);

useEffect(() => {
  let cancelled = false;

  const timeoutId = setTimeout(() => {          // debounce: wait before firing
    async function loadBoards() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchBoards(queryParams);      // <- the service call
        if (!cancelled) {
          setBoards(extractList(response, ["boards", "data"]));
          setPagination(extractPagination(response, /* ... */));
        }
      } catch (err) {
        if (!cancelled) setError("Failed to load education boards");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBoards();
  }, 350);

  return () => {                 // cleanup: runs if inputs change or page unmounts
    cancelled = true;
    clearTimeout(timeoutId);
  };
}, [queryParams, limit, reloadKey]);   // re-run when any of these change
```

> **Why `extractList` / `extractPagination`?** The backend doesn't always return data in the same
> shape — sometimes `response.data`, sometimes `response.data.data`, sometimes
> `response.data.boards`. Each page defines small helper functions that check all the likely
> shapes and return a plain array (and a normalized pagination object). You'll see near-identical
> `extractList`/`extractPagination` helpers copy-pasted at the top of most CRUD pages. It's
> repetitive, but it makes the pages resilient to the API's inconsistency.

### Step 9.3 — Render: loading, error, or the table
```jsx
if (loading) return <Spinner />;
if (error)   return <ErrorBanner message={error} />;

return (
  <table>
    {boards.map((board) => (
      <tr key={board.id}>
        <td>{board.name}</td>
        <td>
          <button onClick={() => setEditTarget(board)}>Edit</button>
          <button onClick={() => setDeleteTarget(board)}>Delete</button>
        </td>
      </tr>
    ))}
  </table>
);
```
Clicking **Edit** just sets `editTarget` to that row; clicking **Delete** sets `deleteTarget`.
Those state changes are what open the modals.

### Step 9.4 — The create/edit modal
The same modal component handles both creating and editing — it's in "edit mode" when you pass it
an existing row. It's a form with its own local state:
```jsx
function BoardModal({ initialData, onClose, onSuccess }) {
  const isEdit = Boolean(initialData);
  const [form, setForm]     = useState({ name: initialData?.name ?? "", /* ... */ });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Board name is required."); return; }
    try {
      setSaving(true);
      if (isEdit) await updateBoard(initialData.id, form);   // UPDATE
      else        await createBoard(form);                    // CREATE
      onSuccess();   // tell the page to refetch
      onClose();     // close the modal
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save board");
    } finally {
      setSaving(false);
    }
  }

  return (/* an overlay <div> containing a <form> with inputs + Cancel/Save buttons */);
}
```
Notice it's the **same form shape as the login page**: field state, a `saving` flag, an `error`
string. After a successful save it calls `onSuccess()` — which on the page side bumps `reloadKey`
so the list refetches and shows the change.

### Step 9.5 — The delete confirmation
Deleting is guarded by a small confirmation modal so users don't delete by accident:
```jsx
async function handleDeleteConfirm() {
  if (!deleteTarget?.id) return;
  try {
    setDeleting(true);
    await deleteBoard(deleteTarget.id);   // the service call
    setDeleteTarget(null);                 // close the confirm modal
    setReloadKey((k) => k + 1);            // refetch the list
  } catch (err) {
    setDeleteError("Failed to delete");
  } finally {
    setDeleting(false);
  }
}
```

### Step 9.6 — The mental model to keep
Every CRUD page is this loop:

```
fetch list ──> show table ──> user clicks Add/Edit/Delete
    ^                                    │
    │                                    ▼
    └──── refetch (reloadKey++) <── modal calls create/update/delete via authService
```

Once this clicks, the ~900-line page files stop being scary: they're just this pattern with more
fields, more columns, and more styling.

> **Reality check:** these page files really are large (700–1,200 lines each) because each one
> re-implements this whole loop *plus* an inline modal component *plus* the extract helpers, all
> with detailed Tailwind styling. There's a lot of repetition between pages. That's a known
> trade-off in the current codebase — every page is self-contained and copy-paste-friendly, at the
> cost of duplication.

---

## Part 10 — Repeating the pattern & nested routes

With the master pattern understood, most remaining pages are "the same thing for a different
noun." Build them one at a time, each with its own `authService` functions.

### Step 10.1 — The flat CRUD pages
These each manage one kind of record and use the Part 9 recipe:

| Page | Route | Manages |
| ---- | ----- | ------- |
| `SchoolsPage` | `/schools` | Schools |
| `ClassesPage` | `/classes` | Classes / grades |
| `SubjectsPage` | `/subjects` | Subjects |
| `TeachersPage` | `/teachers` | Teachers (admin users of type `TEACHER`) |
| `StudentsPage` | `/students` | Students (the `/users` endpoint) |
| `ParentsPage` | `/parents` | Parents and their linked students |
| `EducationBoardsPage` | `/education-boards` | Education boards |

### Step 10.2 — The catalog hierarchy (nested routes)
The academic content is a tree, and the routes mirror it. Each level drills into the next by
putting an **id in the URL**:

```
Education Board → Grades → Syllabus (Textbooks) → Chapters → Topics → Topic detail
```

In `AppRoutes.jsx` those look like:
```jsx
<Route path="education-boards/:boardId/grades" element={<BoardGradesPage />} />
<Route path="syllabus" element={<TextbooksPage />} />
<Route path="syllabus/:textbookId/chapters" element={<ChaptersPage />} />
<Route path="syllabus/:textbookId/chapters/:chapterId/topics" element={<TopicsPage />} />
<Route path="syllabus/:textbookId/chapters/:chapterId/topics/:topicId" element={<TopicDetailPage />} />
```
The `:boardId`, `:textbookId`, etc. are **URL parameters**. A page reads them with the `useParams`
hook and uses them to fetch the right data:
```jsx
import { useParams } from "react-router-dom";

function ChaptersPage() {
  const { textbookId } = useParams();               // grab the id from the URL
  useEffect(() => { fetchChapters({ textbookId }); }, [textbookId]);
  // ...same CRUD pattern as Part 9
}
```
To drill down, a row's click navigates deeper:
`navigate(\`/syllabus/${textbookId}/chapters/${chapter.id}/topics\`)`.

So the whole content section is just the Part 9 pattern, repeated at each level, threaded together
by ids in the URL.

> **Gotcha to know:** there's a `SyllabusPage.jsx` file in `src/pages/`, but it is **not wired
> into the routes** — the `/syllabus` path renders `TextbooksPage`. Treat `SyllabusPage.jsx` as
> leftover/unused unless someone hooks it up.

### Step 10.3 — Build order suggestion
A sensible order to build these, so you always have something testable:
1. Login + ProtectedRoute + layout (Parts 6–8) — you can now log in and see an empty shell.
2. One flat CRUD page end-to-end (e.g. Schools) — proves the whole data loop.
3. The rest of the flat pages by copy-adapting the first.
4. The nested catalog pages (boards→grades, textbooks→chapters→topics).
5. Dashboard, Attendance, Banners, Notifications.

---

## Part 11 — The Dashboard

`src/pages/Dashboard.jsx` is the landing page. It's simpler than the CRUD pages — right now it
shows **static demo data**, not live numbers. It's built from three small components in
`src/components/Dashboard/`:

- **`StatCard.jsx`** — a reusable card showing a title, a number, and an icon. The page renders
  four of them (Total Students, Active Students, Quizzes Assigned, Top Performers) by mapping over
  an array of stat objects:
  ```jsx
  const stats = [
    { title: "Total Students", value: 120, Icon: Users, iconBg: "bg-violet-100", iconColor: "text-violet-500" },
    // ...
  ];
  {stats.map((s) => <StatCard key={s.title} {...s} />)}
  ```
  This is a clean example of **props**: `StatCard` is generic and the page configures each
  instance.
- **`QuickActions.jsx`** — a row of colored action buttons (Create Class, Add Lesson, Assign
  Quiz, Send Announcement). Also data-driven via a `map`. The buttons are currently visual only.
- **`UpcomingTasks.jsx`** — a table of hard-coded sample tasks with colored status pills
  (Completed / Pending).

> Because the numbers are placeholders, wiring the Dashboard to real API endpoints is a natural
> "good first task" for a new developer — and a great way to practice the fetch-in-`useEffect`
> pattern from Part 9 on a smaller page.

---

## Part 12 — The Attendance feature

Attendance is the one feature that is **broken into multiple small components** instead of one
giant page — a good model for how the rest of the app *could* be organized. The page
`src/pages/AttendancePage.jsx` composes pieces from `src/components/Attendance/`:

| Component | Job |
| --------- | --- |
| `AttendanceHeader.jsx` | Title + top actions |
| `AttendanceStats.jsx` | Summary numbers (present/absent counts) |
| `AttendanceFilters.jsx` | Filter controls (class, date, etc.) |
| `AttendanceCalendar.jsx` | Calendar view of attendance |
| `AttendanceTable.jsx` | The per-student attendance rows |
| `Addattendancemodal.jsx` | Modal form to record attendance |
| `DatePickerModal.jsx` | A date-picker popup |

The page holds the shared state (selected date, filters, the fetched records) and passes it down
to these children as props, while the children report user actions back up through callback props.
The data still comes from `authService` functions: `fetchAttendance`, `createAttendance`,
`updateAttendance`, `deleteAttendance`, and `exportAttendanceCsv`.

**Lesson to take from this part:** when a screen gets complex, split it into focused child
components and keep the state in the parent. That's exactly what the CRUD pages *don't* do (they're
monolithic), so Attendance is the contrast to study.

---

## Part 13 — Banners & Notifications (file upload)

Two feature pages worth a quick look because they introduce one new idea: **file upload**.

### Banners (`BannerPage.jsx`)
Standard CRUD, but creating a banner involves uploading an image first. The `uploadFile` helper in
`authService.js` sends the file as `multipart/form-data` (not JSON) and returns the hosted URL:
```js
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.data?.url || data?.url || /* ...several fallbacks... */ "";
}
```
The flow is: user picks an image → `uploadFile` returns a URL → that URL is included in the
`createBanner` / `updateBanner` payload. The many `||` fallbacks exist because the server's
response shape isn't guaranteed — same defensive spirit as `extractList`.

### Notifications (`NotificationsPage.jsx`)
Lets an admin compose and send a push notification (`sendNotification`) and lists past ones
(`fetchNotifications`). Otherwise it's the familiar list + form pattern.

---

## Part 14 — Running, building, and linting

### Scripts (from `package.json`)
```bash
npm run dev       # start the dev server with hot reload (development)
npm run build     # produce an optimized production build in dist/
npm run preview   # serve the built dist/ locally to test the production build
npm run lint      # run ESLint over the whole project
```

### Linting setup
The project uses ESLint 9's "flat config" in `eslint.config.js`, with plugins for React Hooks and
React Fast Refresh. Install the dev dependencies:
```bash
npm install -D eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals @vitejs/plugin-react
```
One rule worth knowing: `no-unused-vars` is set to **error**, but names starting with a capital
letter or `_` are ignored (`varsIgnorePattern: '^[A-Z_]'`). So an imported-but-unused component
won't trip it, but a stray lowercase variable will. Run `npm run lint` before committing.

### Vite config
`vite.config.js` is tiny — it just enables the React plugin:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

---

## Glossary & where to go next

### Quick glossary
| Term | Meaning in this project |
| ---- | ----------------------- |
| **Component** | A function returning JSX; the building block of every screen. |
| **Props** | Inputs passed from a parent component to a child. |
| **State** (`useState`) | Data a component owns that, when changed, re-renders it. |
| **Effect** (`useEffect`) | Code that runs after render — we use it to fetch data. |
| **Route** | A URL-to-component mapping, defined in `AppRoutes.jsx`. |
| **Outlet** | The slot in a layout where the active child page renders. |
| **Interceptor** | axios code that runs on every request/response (auth + refresh). |
| **Service function** | A named function in `authService.js` that calls one API endpoint. |
| **CRUD** | Create / Read / Update / Delete — the shape of most pages. |
| **Modal** | A pop-up form/dialog layered over the page. |
| **localStorage** | Browser storage where we keep the tokens and admin profile. |

### The order this app was built (recap)
1. Scaffold with Vite, install libraries, set up Tailwind. *(Parts 1–3)*
2. Entry point + router + a couple placeholder pages. *(Parts 4–5)*
3. The layout shell: Sidebar + Navbar + `Outlet`. *(Part 6)*
4. The API layer: `axiosInstance` (with interceptors) + `authService`. *(Part 7)*
5. Auth: login page, token storage, `ProtectedRoute`, nested routes. *(Part 8)*
6. One CRUD page end-to-end — the master pattern. *(Part 9)*
7. Repeat for every other domain, including the nested catalog pages. *(Part 10)*
8. Dashboard, Attendance, Banners, Notifications. *(Parts 11–13)*
9. Lint, build, ship. *(Part 14)*

### Good first tasks to learn the codebase
- Wire the Dashboard's stat cards to real API data (practice Part 9's fetch pattern on an easy
  page).
- Move the hard-coded `BASE_URL` into a Vite env variable (`VITE_API_URL`).
- Remove the leftover `console.log` calls in `authService.js`.
- Decide whether to route or delete the unused `SyllabusPage.jsx`.

### If you get stuck
- **A page shows no data** → open the browser DevTools *Network* tab. Is the request firing? What
  status does it return? A `401` that isn't recovering points at the token; an empty table with a
  `200` usually means `extractList` didn't recognize the response shape.
- **A route shows nothing** → check it's nested correctly inside `ProtectedRoute` → `AdminLayout`
  in `AppRoutes.jsx`, and that the layout still has its `<Outlet/>`.
- **Styling isn't applying** → confirm the class isn't a typo and that the file is covered by
  `tailwind.config.js`'s `content` globs.

Welcome to the project — start by reading `src/pages/EducationBoardsPage.jsx` alongside Part 9,
then build a small CRUD page of your own. Once that clicks, the rest of the app is the same idea
repeated.
</content>
