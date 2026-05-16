/**
 * Spine e2e gate — v2.
 *
 * The single test that must stay green for v2 to be considered "working":
 * scaffold a one-block project → `npm install` → `astro build` → read dist/index.html →
 * assert the palette CSS link is present and the block's default headline rendered.
 *
 * Every other v2 task builds on top of this passing test. If this goes red,
 * nothing else is allowed to merge until it's green again.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { scaffoldProject } from "../../src/index.js";
import type { ResolvedConfig } from "../../src/schemas/config.js";

const HERO_DEFAULT_HEADLINE = "Calendars that protect deep work";
const FEATURES_DEFAULT_HEADLINE = "Built for teams that ship";
const CTA_DEFAULT_HEADLINE = "Ready to ship your next side project?";
// Footer copyright is auto-derived from projectName when site.config.legal
// isn't set — `humanizeProjectName("spine-test")` → "Spine Test".
const FOOTER_COPYRIGHT_PATTERN = /© \d{4} Spine Test/;

function makeConfig(
  projectDir: string,
  blocks: ReadonlyArray<string>,
): ResolvedConfig {
  return {
    projectName: "spine-test",
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: blocks.map((name) => ({ name, variant: "default" })),
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      preset: "obsidian",
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

async function scaffoldAndBuild(
  blocks: ReadonlyArray<string>,
): Promise<{ projectDir: string; html: string; cleanup: () => void }> {
  const tmp = mkdtempSync(join(tmpdir(), "fornix-spine-"));
  const projectDir = join(tmp, "site");
  const cleanup = () => rmSync(tmp, { recursive: true, force: true });

  const result = await scaffoldProject(makeConfig(projectDir, blocks));
  if (!result.ok) {
    cleanup();
    throw new Error(`Scaffold failed: ${JSON.stringify(result.error)}`);
  }

  execSync("npm install --no-audit --no-fund --loglevel=error", {
    cwd: projectDir,
    stdio: "pipe",
  });
  execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

  const indexHtmlPath = join(projectDir, "dist", "index.html");
  const html = readFileSync(indexHtmlPath, "utf8");
  return { projectDir, html, cleanup };
}

describe("v2 spine", () => {
  it("scaffolds a single block → palette + headline render", async () => {
    const { projectDir, html, cleanup } = await scaffoldAndBuild([
      "hero-text",
    ]);
    try {
      expect(html).toContain('id="fornix-palette-link"');
      expect(html).toContain("/styles/palettes/_current.css");
      expect(html).toContain(HERO_DEFAULT_HEADLINE);
      expect(html).not.toMatch(/<img[^>]*\bsrc=""[^>]*>/);

      const paletteCssPath = join(
        projectDir,
        "dist",
        "styles",
        "palettes",
        "_current.css",
      );
      expect(existsSync(paletteCssPath), "_current.css not in dist").toBe(true);
      const css = readFileSync(paletteCssPath, "utf8");
      expect(css).toContain("--color-primary");
      expect(css).toContain("--color-background");
    } finally {
      cleanup();
    }
  }, 180_000);

  it("scaffolds 4 blocks → each renders its default content", async () => {
    const { html, cleanup } = await scaffoldAndBuild([
      "hero-text",
      "features-grid",
      "cta-strip",
      "footer-columns",
    ]);
    try {
      expect(html).toContain(HERO_DEFAULT_HEADLINE);
      expect(html).toContain(FEATURES_DEFAULT_HEADLINE);
      expect(html).toContain(CTA_DEFAULT_HEADLINE);
      expect(html).toMatch(FOOTER_COPYRIGHT_PATTERN);
      expect(html).not.toMatch(/<img[^>]*\bsrc=""[^>]*>/);

      // Each block's primitive-composed class lands in the DOM.
      expect(html).toContain("fnx-hero-text");
      expect(html).toContain("fnx-features__");
      expect(html).toContain("fnx-cta-strip");
      expect(html).toContain("fnx-footer");
    } finally {
      cleanup();
    }
  }, 240_000);

  it("orders blocks by category regardless of input order", async () => {
    // Pass blocks in reverse: footer → cta → features → hero.
    // Expected render order: hero → features → cta → footer.
    const { html, cleanup } = await scaffoldAndBuild([
      "footer-columns",
      "cta-strip",
      "features-grid",
      "hero-text",
    ]);
    try {
      // Search by primitive-composed BEM class — every new block ships one.
      const heroPos = html.indexOf("fnx-hero-text");
      const featuresPos = html.indexOf("fnx-features");
      const ctaPos = html.indexOf("fnx-cta-strip");
      const footerPos = html.indexOf("fnx-footer");

      expect(heroPos).toBeGreaterThan(-1);
      expect(featuresPos).toBeGreaterThan(-1);
      expect(ctaPos).toBeGreaterThan(-1);
      expect(footerPos).toBeGreaterThan(-1);

      expect(heroPos).toBeLessThan(featuresPos);
      expect(featuresPos).toBeLessThan(ctaPos);
      expect(ctaPos).toBeLessThan(footerPos);
    } finally {
      cleanup();
    }
  }, 240_000);
});
