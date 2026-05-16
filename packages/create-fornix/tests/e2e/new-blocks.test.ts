/**
 * New-blocks e2e — verifies the v0.3 block rewrite works end-to-end:
 *   - blocks compose primitives via relative imports
 *   - blocks read site.config via `import { site } from "../../site.config"`
 *   - the resulting Astro project installs + builds + serves clean HTML
 *
 * Each new block lands in this file as it's authored. Day 6 covers
 * header-sticky + hero-text; days 7-8 add the rest.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  scaffoldProject,
  type ResolvedConfig,
} from "../../src/index.js";

function makeConfig(projectDir: string): ResolvedConfig {
  return {
    projectName: "helix-app",
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: [
      { name: "header-sticky", variant: "default" },
      { name: "hero-text", variant: "default" },
    ],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      preset: "obsidian",
      colors: {
        primary: "#8b5cf6",
        secondary: "#6366f1",
        accent: "#06b6d4",
        background: "#0a0a0a",
        foreground: "#f4f4f5",
      },
    },
    themeSwitcher: false,
    createdWith: "manual",
  };
}

describe("v0.3 new blocks (header-sticky + hero-text)", () => {
  it("header-sticky + hero-text → renders with site.config + primitives", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-newblocks-"));
    const projectDir = join(tmp, "site");

    try {
      const result = await scaffoldProject(makeConfig(projectDir));
      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);

      // Primitives + site.config are present
      expect(
        existsSync(join(projectDir, "src/components/primitives/Button.astro")),
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "src/components/primitives/Container.astro")),
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "src/components/primitives/Headline.astro")),
      ).toBe(true);
      expect(existsSync(join(projectDir, "src/site.config.ts"))).toBe(true);

      // New blocks are placed in src/components/sections/
      expect(
        existsSync(join(projectDir, "src/components/sections/header-sticky.astro")),
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "src/components/sections/hero-text.astro")),
      ).toBe(true);

      // Install + build
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      const html = readFileSync(
        join(projectDir, "dist", "index.html"),
        "utf8",
      );

      // ── Header (composes Container + Button + Icon; reads site.config) ──
      // Brand name from site.config.name (humanized projectName "Helix App")
      expect(html).toContain("Helix App");
      // Header class present
      expect(html).toContain('class="fnx-header"');
      // Monogram from site.config.logo.text (initials "HA")
      expect(html).toMatch(/fnx-header__monogram[^>]*>\s*HA/);

      // ── Hero (composes Section + Container + Headline + Eyebrow + Button) ──
      // Default headline from hero-text default-content
      expect(html).toContain("Calendars that protect deep work");
      expect(html).toContain("Now in beta");
      expect(html).toContain("Start free trial");

      // Primitives' BEM classes appear (proves composition)
      expect(html).toContain("fnx-headline");
      expect(html).toContain("fnx-eyebrow");
      expect(html).toContain("fnx-button");
      expect(html).toContain("fnx-container");
      expect(html).toContain("fnx-section");

      // Palette CSS link wired
      expect(html).toContain('id="fornix-palette-link"');
      // global.css imported (Tailwind + fonts pipeline)
      expect(html).toMatch(/<link[^>]*rel="stylesheet"/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);

  it("hero-media + features-grid → renders illustration + 6-card grid", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-newblocks-hm-"));
    const projectDir = join(tmp, "site");

    try {
      const config = makeConfig(projectDir);
      const result = await scaffoldProject({
        ...config,
        blocks: [
          { name: "hero-media", variant: "default" },
          { name: "features-grid", variant: "default" },
        ],
      });
      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);

      // hero-media ships its default illustration to public/illustrations/
      expect(
        existsSync(join(projectDir, "public/illustrations/hero-default.svg")),
      ).toBe(true);

      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      const html = readFileSync(
        join(projectDir, "dist", "index.html"),
        "utf8",
      );

      // ── hero-media ──────────────────────────────────────────
      expect(html).toContain("The intern your whole team trusts");
      expect(html).toContain("/illustrations/hero-default.svg");
      expect(html).toContain("fnx-hero-media");

      // ── features-grid ───────────────────────────────────────
      expect(html).toContain("Built for teams that ship");
      // All 6 feature titles render
      expect(html).toContain("Atomic preview deploys");
      expect(html).toContain("Rollback in one click");
      expect(html).toContain("Edge-first by default");
      expect(html).toContain("Drop-in CDN");
      expect(html).toContain("Observability built in");
      expect(html).toContain("Support that ships");

      // Primitive BEM classes prove composition
      expect(html).toContain("fnx-card--bordered");
      expect(html).toContain("fnx-icon");

      // The bundled illustration also lands in dist (Astro copies public/)
      expect(
        existsSync(join(projectDir, "dist/illustrations/hero-default.svg")),
      ).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);

  it("full v0.3 landing: 7 new blocks compose into a complete page", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-newblocks-full-"));
    const projectDir = join(tmp, "site");

    try {
      const config = makeConfig(projectDir);
      const result = await scaffoldProject({
        ...config,
        blocks: [
          { name: "header-sticky", variant: "default" },
          { name: "hero-media", variant: "default" },
          { name: "features-grid", variant: "default" },
          { name: "pricing-table", variant: "default" },
          { name: "faq", variant: "default" },
          { name: "cta-strip", variant: "default" },
          { name: "footer-columns", variant: "default" },
        ],
      });
      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);

      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      const html = readFileSync(
        join(projectDir, "dist", "index.html"),
        "utf8",
      );

      // Every new block contributes recognizable rendered output.
      expect(html).toContain("fnx-header");                 // header-sticky
      expect(html).toContain("fnx-hero-media");             // hero-media
      expect(html).toContain("Built for teams that ship");  // features-grid headline
      expect(html).toContain("Simple, honest pricing");     // pricing-table headline
      expect(html).toContain("Questions everyone asks first"); // faq headline
      expect(html).toContain("fnx-cta-strip");              // cta-strip
      expect(html).toContain("fnx-footer");                 // footer-columns

      // Pricing-table-specific: highlighted "Most Popular" badge appears
      expect(html).toContain("Most Popular");
      // Three pricing plans render with their realistic prices
      expect(html).toContain("$19");
      expect(html).toContain("$49");
      expect(html).toContain("$199");

      // FAQ uses native <details>/<summary> — zero JS accordion
      expect(html).toContain("<details");
      expect(html).toContain("<summary");

      // Footer reflects site.config-derived data
      expect(html).toContain("Helix App");                  // brand name
      expect(html).toContain("© ");                         // copyright auto-generated

      // No empty <img src=""> — sanity check that no block ships broken images
      expect(html).not.toMatch(/<img[^>]*\bsrc=""[^>]*>/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 360_000);
});
