import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression config — kept narrow on purpose.
 *
 * - Single project: chromium headless. Multi-browser screenshot diffing is
 *   noisy and rarely surfaces real bugs; we run one canonical browser.
 * - `reuseExistingServer` is OFF: each test owns its own `astro preview`
 *   instance because we test multiple scaffolded sites in one run.
 * - Tests live in `tests/visual/` so they're cleanly separable from the
 *   vitest-based functional suite (`tests/{unit,integration,e2e}`).
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1, // each test scaffolds + builds; parallelism would just thrash disk
  timeout: 240_000,
  expect: {
    toHaveScreenshot: {
      // Allow tiny anti-aliasing variance. Anything above this should be a
      // deliberate UI change reflected in a baseline update.
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    },
  },
  reporter: process.env.CI ? "github" : "list",
  use: {
    headless: true,
    trace: "off",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
