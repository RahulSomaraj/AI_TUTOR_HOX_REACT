import { test, expect } from "@playwright/test";

// Top-level routes that don't require a path parameter. These are visited with a
// pre-authenticated session (see auth.setup.js) and asserted to actually render.
const routes = [
  { path: "/", name: "Dashboard" },
  { path: "/education-boards", name: "Education Boards" },
  { path: "/classes", name: "Classes" },
  { path: "/schools", name: "Schools" },
  { path: "/subjects", name: "Subjects" },
  { path: "/syllabus", name: "Syllabus (Textbooks)" },
  { path: "/teachers", name: "Teachers" },
  { path: "/students", name: "Students" },
  { path: "/notifications", name: "Notifications" },
  { path: "/parents", name: "Parents" },
  { path: "/banner", name: "Banner" },
  { path: "/attendance", name: "Attendance" },
];

for (const route of routes) {
  test(`renders: ${route.name} (${route.path})`, async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(route.path);

    // 1) Not bounced back to the login screen (auth/route guard working).
    await expect(page).not.toHaveURL(/\/login/);

    // 2) The page chrome rendered a heading (didn't render blank).
    await expect(page.locator("h1").first()).toBeVisible();

    // 3) The root error boundary did NOT trip.
    await expect(page.getByText("Something went wrong")).toHaveCount(0);

    // 4) No uncaught runtime errors while rendering.
    expect(pageErrors, `Uncaught errors on ${route.path}`).toEqual([]);
  });
}

// Sanity check: an unauthenticated context is redirected to /login.
test("unauthenticated user is redirected to login", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/subjects");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});

/*
 * Parameterized routes (board grades, chapters, topics, topic detail) need real
 * IDs. To cover them, fetch a valid id first, e.g.:
 *
 *   await page.goto("/education-boards");
 *   const firstRow = page.locator("table tbody tr").first();
 *   ... click into it, then assert the nested page renders.
 *
 * Add those once you've confirmed the smoke suite is green.
 */
