import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Load test-only env vars (credentials, base URL) from .env.e2e if present.
// Kept out of the app's .env so they're never exposed to the client bundle,
// and git-ignored so they're never committed. Real environment variables take
// precedence over the file.
const e2eEnvPath = path.resolve(process.cwd(), ".env.e2e");
if (fs.existsSync(e2eEnvPath)) {
  for (const line of fs.readFileSync(e2eEnvPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

// Base URL of the running app (Vite dev server by default). Override with
// E2E_BASE_URL if you serve it elsewhere.
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // 1) Log in once and save the authenticated session (token in localStorage).
    { name: "setup", testMatch: /auth\.setup\.js/ },
    // 2) Run the page suite reusing that saved session.
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/state.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Auto-start the dev server before the tests. It reads your .env, so make sure
  // VITE_API_BASE_URL points at the live backend before running.
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
