/**
 * Interactive-state visual regression.
 *
 * Catches bugs that only surface when a user clicks, hovers, or
 * keyboard-focuses something — exactly the class of regression that
 * the "render a static page and screenshot it" approach misses.
 *
 * Covers:
 *   - hero CTA hover state         (CSS pseudo-class :hover)
 *   - hero CTA focus state         (keyboard accessibility)
 *   - faq-accordion expanded item  (native <details open>)
 *   - pricing-toggle annual prices (script-driven state change)
 *
 * Update baselines with:
 *   pnpm exec playwright test --update-snapshots
 */
import { test, expect } from "@playwright/test";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";

import { scaffoldProject } from "../../src/scaffold/scaffold-project.js";
import { loadPaletteData } from "../../src/scaffold/palette.js";
import type { ResolvedConfig } from "../../src/schemas/config.js";

const BLOCKS = [
  "hero-gradient",
  "faq-accordion",
  "pricing-toggle",
  "footer-minimal",
];

function makeConfig(projectDir: string): ResolvedConfig {
  const data = loadPaletteData("midnight");
  if (!data.ok) throw new Error("palette load failed");
  return {
    projectName: "visual-interactive",
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: BLOCKS.map((name) => ({ name, variant: "default" })),
    locales: ["en"],
    defaultLocale: "en",
    palette: { preset: "midnight", colors: data.value.colors },
    themeSwitcher: false,
    createdWith: "manual",
  };
}

let tmpDir: string;
let previewUrl: string;
let previewProcess: ChildProcess | null = null;

test.beforeAll(async () => {
  test.setTimeout(300_000);
  tmpDir = mkdtempSync(join(tmpdir(), "fornix-visual-interactive-"));
  const projectDir = join(tmpDir, "site");

  const result = await scaffoldProject(makeConfig(projectDir));
  if (!result.ok) {
    throw new Error(`Scaffold failed: ${JSON.stringify(result.error)}`);
  }

  execSync("npm install --no-audit --no-fund --loglevel=error", {
    cwd: projectDir,
    stdio: "pipe",
  });
  execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

  const port = 4700 + Math.floor(Math.random() * 100);
  previewUrl = `http://127.0.0.1:${port}`;
  previewProcess = spawn(
    "npx",
    ["astro", "preview", "--port", String(port), "--host", "127.0.0.1"],
    { cwd: projectDir, stdio: "pipe" },
  );

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
    await sleep(200);
  }
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(previewUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // Disable animations for stable screenshots.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
});

test("hero CTA: idle state (no hover, no focus)", async ({ page }) => {
  const cta = page.locator(".hero-gradient__cta");
  await expect(cta).toBeVisible();
  // Move pointer far away to ensure no accidental hover.
  await page.mouse.move(0, 0);
  await expect(cta).toHaveScreenshot("hero-cta-idle.png");
});

test("hero CTA: hover state", async ({ page }) => {
  const cta = page.locator(".hero-gradient__cta");
  await cta.hover();
  // Give the browser a beat to apply :hover styles (animations are disabled).
  await sleep(50);
  await expect(cta).toHaveScreenshot("hero-cta-hover.png");
});

test("hero CTA: keyboard focus state", async ({ page }) => {
  const cta = page.locator(".hero-gradient__cta");
  await cta.focus();
  await sleep(50);
  await expect(cta).toHaveScreenshot("hero-cta-focus.png");
});

test("faq-accordion: first item collapsed → expanded", async ({ page }) => {
  const firstItem = page.locator(".faq-accordion__item").first();
  await expect(firstItem).toBeVisible();

  // Collapsed baseline first.
  await firstItem.scrollIntoViewIfNeeded();
  await expect(firstItem).toHaveScreenshot("faq-item-collapsed.png");

  // Click the summary; <details> picks up `open` attribute.
  await firstItem.locator(".faq-accordion__question").click();
  await page.waitForFunction(() => {
    const el = document.querySelector(".faq-accordion__item");
    return el?.hasAttribute("open");
  });
  await expect(firstItem).toHaveScreenshot("faq-item-expanded.png");
});

test("pricing-toggle: monthly → annual prices", async ({ page }) => {
  const grid = page.locator(".pricing-toggle__grid");
  await grid.scrollIntoViewIfNeeded();
  // Wait for the JS that wires the toggle.
  await page.waitForSelector(".pricing-toggle__switch");

  // Monthly baseline.
  await expect(grid).toHaveScreenshot("pricing-grid-monthly.png");

  // Click the switch.
  await page.locator(".pricing-toggle__switch").click();
  await page.waitForFunction(() => {
    const sw = document.querySelector(".pricing-toggle__switch");
    return sw?.getAttribute("aria-checked") === "true";
  });

  await expect(grid).toHaveScreenshot("pricing-grid-annual.png");
});

test("no horizontal overflow at desktop", async ({ page }) => {
  const overflow = await page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(overflow.docWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
});
