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
 *   - faq item expanded            (native <details open>)
 *   - pricing-table featured badge  (highlighted plan visible)
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
  "hero-text",
  "faq",
  "pricing-table",
  "footer-columns",
];

function makeConfig(projectDir: string): ResolvedConfig {
  const data = loadPaletteData("obsidian");
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
    palette: { preset: "obsidian", colors: data.value.colors },
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

// The hero CTAs in v0.3 are <Button> primitives. Multiple buttons can exist
// on the page (hero primary + secondary), so we target the first primary
// button inside the hero section specifically.
const HERO_CTA_SELECTOR = ".fnx-hero-text .fnx-button--primary";

test("hero CTA: idle state (no hover, no focus)", async ({ page }) => {
  const cta = page.locator(HERO_CTA_SELECTOR).first();
  await expect(cta).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(cta).toHaveScreenshot("hero-cta-idle.png");
});

test("hero CTA: hover state", async ({ page }) => {
  const cta = page.locator(HERO_CTA_SELECTOR).first();
  await cta.hover();
  await sleep(50);
  await expect(cta).toHaveScreenshot("hero-cta-hover.png");
});

test("hero CTA: keyboard focus state", async ({ page }) => {
  const cta = page.locator(HERO_CTA_SELECTOR).first();
  await cta.focus();
  await sleep(50);
  await expect(cta).toHaveScreenshot("hero-cta-focus.png");
});

test("faq: first item collapsed → expanded (native details)", async ({ page }) => {
  const firstItem = page.locator(".fnx-faq__item").first();
  await expect(firstItem).toBeVisible();

  await firstItem.scrollIntoViewIfNeeded();
  await expect(firstItem).toHaveScreenshot("faq-item-collapsed.png");

  // Click the <summary> — <details> picks up `open` attribute natively.
  await firstItem.locator(".fnx-faq__summary").click();
  await page.waitForFunction(() => {
    const el = document.querySelector(".fnx-faq__details");
    return el?.hasAttribute("open");
  });
  await expect(firstItem).toHaveScreenshot("faq-item-expanded.png");
});

test("pricing-table: highlighted plan card renders with featured badge", async ({ page }) => {
  const featured = page.locator(".fnx-pricing__card .fnx-pricing__badge").first();
  await expect(featured).toBeVisible();
  await expect(featured).toHaveText("Most Popular");
});

test("no horizontal overflow at desktop", async ({ page }) => {
  const overflow = await page.evaluate(() => ({
    docWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(overflow.docWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
});
