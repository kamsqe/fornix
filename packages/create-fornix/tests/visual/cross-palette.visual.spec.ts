/**
 * Cross-palette × cross-viewport visual regression.
 *
 * Catches palette-binding regressions (a CSS change that only breaks one
 * theme) and responsive regressions (a layout change that only breaks
 * mobile) in one pass.
 *
 * Matrix: 3 palettes × 3 viewports = 9 baselines per run.
 *
 *   palettes: obsidian (dark)   |  aurora (gradient)  |  paper (light)
 *   viewports: mobile 375×812   |  tablet 768×1024        |  desktop 1280×720
 *
 * Each palette scaffolds + builds + boots an `astro preview` ONCE in a
 * shared `beforeAll`; the three viewport tests reuse that server.
 *
 * Update baselines after a deliberate UI change:
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

const PALETTES = ["obsidian", "aurora", "paper"] as const;
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 720 },
] as const;

const BLOCKS = [
  "header-sticky",
  "hero-text",
  "features-grid",
  "cta-strip",
  "footer-columns",
];

function makeConfig(
  palette: (typeof PALETTES)[number],
  projectDir: string,
): ResolvedConfig {
  const data = loadPaletteData(palette);
  if (!data.ok) throw new Error(`Palette load failed: ${palette}`);
  return {
    projectName: `visual-${palette}`,
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: BLOCKS.map((name) => ({ name, variant: "default" })),
    locales: ["en"],
    defaultLocale: "en",
    palette: { preset: palette, colors: data.value.colors },
    themeSwitcher: false,
    createdWith: "manual",
  };
}

for (const palette of PALETTES) {
  test.describe.serial(`palette: ${palette}`, () => {
    let tmpDir: string;
    let previewProcess: ChildProcess | null = null;
    let previewUrl: string;

    test.beforeAll(async () => {
      test.setTimeout(300_000);
      tmpDir = mkdtempSync(join(tmpdir(), `fornix-visual-${palette}-`));
      const projectDir = join(tmpDir, "site");

      const result = await scaffoldProject(makeConfig(palette, projectDir));
      if (!result.ok) {
        throw new Error(`Scaffold failed: ${JSON.stringify(result.error)}`);
      }

      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // Spread ports across palettes so parallel-friendly even if Playwright
      // is later parallelized; today this suite runs serially.
      const paletteIdx = PALETTES.indexOf(palette);
      const port = 4500 + paletteIdx * 10 + Math.floor(Math.random() * 10);
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

    for (const viewport of VIEWPORTS) {
      test(`renders at ${viewport.name} (${viewport.width}×${viewport.height})`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
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

        await expect(page).toHaveScreenshot(
          `${palette}-${viewport.name}.png`,
          { fullPage: true },
        );

        // Responsiveness sanity — no horizontal scroll at any viewport.
        const overflow = await page.evaluate(() => {
          return {
            docWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            bodyOverflowX: getComputedStyle(document.body).overflowX,
          };
        });
        expect(
          overflow.docWidth,
          `Horizontal overflow at ${viewport.name}: doc ${overflow.docWidth}px > viewport ${overflow.viewportWidth}px`,
        ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
      });
    }
  });
}
