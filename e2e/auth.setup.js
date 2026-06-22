import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";

const authFile = "e2e/.auth/state.json";

// Logs in through the real UI against the live backend, then persists the
// authenticated browser state (the token in localStorage) so the page suite
// doesn't have to log in for every test.
setup("authenticate", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Set E2E_USERNAME and E2E_PASSWORD environment variables (a test admin login) to run the E2E suite."
    );
  }

  await page.goto("/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();

  // Success = we leave /login (token stored, redirect to dashboard).
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });

  fs.mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: authFile });
});
