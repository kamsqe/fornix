/**
 * Visual regression — multi-block scaffold.
 *
 * The functional e2e suite already proves the right text reaches the DOM.
 * This test proves the page LOOKS right: layout, palette, typography.
 *
 * Update baselines (intentional UI change) with:
 *   pnpm exec playwright test --update-snapshots
 *
 * Without baselines (first run), Playwright captures them and reports
 * "snapshot doesn't exist" as a failure. Re-run with --update-snapshots
 * to accept the captured baseline.
 */
import { test, expect } from "@playwright/test";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";

import { scaffoldProject } from "../../src/scaffold/scaffold-project.js";
import type { ResolvedConfig } from "../../src/schemas/config.js";

const PROJECT_NAME = "visual-multiblock";

let tmpDir: string;
let projectDir: string;
let previewProcess: ChildProcess | null = null;
let previewUrl: string;

function makeConfig(): ResolvedConfig {
  return {
    projectName: PROJECT_NAME,
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: [
      { name: "hero-gradient", variant: "default" },
      { name: "features-grid", variant: "default" },
      { name: "cta-banner", variant: "default" },
      { name: "footer-minimal", variant: "default" },
    ],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      preset: "midnight",
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    },
    themeSwitcher: false,
    createdWith: "manual",
  };
}

test.beforeAll(async () => {
  // beforeAll does scaffold + npm install + astro build; budget generously.
  test.setTimeout(300_000);
  tmpDir = mkdtempSync(join(tmpdir(), "fornix-visual-"));
  projectDir = join(tmpDir, "site");

  const result = await scaffoldProject(makeConfig());
  if (!result.ok) {
    throw new Error(`Scaffold failed: ${JSON.stringify(result.error)}`);
  }

  execSync("npm install --no-audit --no-fund --loglevel=error", {
    cwd: projectDir,
    stdio: "pipe",
  });
  execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

  // Astro preview defaults to port 4321; let it choose so we don't collide
  // when this suite runs alongside other tests.
  const port = 4400 + Math.floor(Math.random() * 1000);
  previewUrl = `http://127.0.0.1:${port}`;
  previewProcess = spawn(
    "npx",
    ["astro", "preview", "--port", String(port), "--host", "127.0.0.1"],
    { cwd: projectDir, stdio: "pipe" },
  );

  // Wait for the preview server to respond (max 30s).
  const start = Date.now();
  while (Date.now() - start < 30_000) {
    try {
      const res = await fetch(previewUrl);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error(`astro preview did not start within 30s on ${previewUrl}`);
});

test.afterAll(async () => {
  if (previewProcess) {
    previewProcess.kill("SIGTERM");
    // give it a moment to release the port
    await sleep(200);
  }
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("midnight + 4 blocks renders without layout regressions", async ({
  page,
}) => {
  await page.goto(previewUrl, { waitUntil: "networkidle" });

  // Stabilize the page before snapshotting — fonts, lazy-loaded images,
  // anything CSS-paint-related.
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot("multi-block-midnight-desktop.png", {
    fullPage: true,
  });
});
