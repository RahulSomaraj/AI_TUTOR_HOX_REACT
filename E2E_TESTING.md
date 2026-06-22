# End-to-End Testing (Playwright)

These tests log in against your **live backend** and verify that every top-level
page renders without crashing, redirecting to login, or tripping the error
boundary.

> They must be run on your machine (or CI) — they need `npm install` to have run
> and network access to your backend.

## One-time setup

1. Install dependencies (this also pulls in `@tanstack/react-query` and Playwright):

   ```bash
   npm install
   npx playwright install chromium
   ```

2. Create a `.env` file (copy from `.env.example`) and point it at the backend:

   ```
   VITE_API_BASE_URL=https://your-backend.example.com
   VITE_API_TIMEOUT_MS=30000
   ```

3. Provide a **test admin login** via environment variables. These are read at
   run time and never committed.

   PowerShell:
   ```powershell
   $env:E2E_USERNAME="admin@example.com"; $env:E2E_PASSWORD="••••••"
   ```

   bash/zsh:
   ```bash
   export E2E_USERNAME="admin@example.com"
   export E2E_PASSWORD="••••••"
   ```

## Running

```bash
npm run test:e2e        # headless run (auto-starts the dev server)
npm run test:e2e:ui     # interactive UI mode
npm run test:e2e:report # open the last HTML report
```

The config auto-starts `vite` on port 5173, logs in once (saving the session to
`e2e/.auth/state.json`), then visits each route.

## What's covered

`e2e/pages.spec.js` checks these routes render: Dashboard, Education Boards,
Classes, Schools, Subjects, Syllabus, Teachers, Students, Notifications, Parents,
Banner, Attendance — plus a guard test that an unauthenticated user is redirected
to `/login`.

Parameterized routes (board grades, chapters, topics, topic detail) need real
IDs; see the commented example at the bottom of `pages.spec.js` to add them once
the smoke suite is green.

## If a test fails

- **Setup/login fails** → check `VITE_API_BASE_URL`, `E2E_USERNAME`,
  `E2E_PASSWORD`, and that the backend is reachable.
- **A page errors** → the HTML report (`npm run test:e2e:report`) has a screenshot
  and trace for the failing route.
