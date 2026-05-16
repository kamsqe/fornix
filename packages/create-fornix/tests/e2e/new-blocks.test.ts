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
  it("scaffolds → installs → builds → renders header + hero with site.config + primitives", async () => {
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
});
