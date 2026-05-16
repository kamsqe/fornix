/**
 * Multi-page e2e — proves the v0.3 pipeline supports archetype-driven
 * multi-page sites. Each `PageSelection` becomes one `.astro` under
 * `src/pages/{slug}.astro` and serves at `/`, `/pricing`, `/about`, ...
 *
 * Single-page mode is verified by every other e2e (spine, cli, ai-copy):
 * if `config.pages` is absent, the scaffolder emits one home page from
 * `config.blocks` — the established v0.2 behavior, unchanged.
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
    projectName: "two-page-test",
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    // `blocks` still present (required by schema); ignored when `pages` is set.
    blocks: [{ name: "hero-text", variant: "default" }],
    pages: [
      {
        slug: "",
        title: "Home",
        description: "Home page of the test scaffold.",
        blocks: [
          { name: "header-sticky", variant: "default" },
          { name: "hero-text", variant: "default" },
          { name: "features-grid", variant: "default" },
          { name: "cta-strip", variant: "default" },
          { name: "footer-columns", variant: "default" },
        ],
      },
      {
        slug: "pricing",
        title: "Pricing",
        description: "Pricing plans for the test scaffold.",
        blocks: [
          { name: "header-sticky", variant: "default" },
          { name: "pricing-table", variant: "default" },
          { name: "faq", variant: "default" },
          { name: "footer-columns", variant: "default" },
        ],
      },
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

describe("v0.3 multi-page", () => {
  it("scaffolds 2 pages → both render, blocks correctly partitioned", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-multipage-"));
    const projectDir = join(tmp, "site");

    try {
      const result = await scaffoldProject(makeConfig(projectDir));
      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);

      // Both .astro pages emitted
      expect(
        existsSync(join(projectDir, "src/pages/index.astro")),
        "src/pages/index.astro not emitted",
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "src/pages/pricing.astro")),
        "src/pages/pricing.astro not emitted",
      ).toBe(true);

      // Block files shared (header + footer used by both pages but copied once)
      expect(
        existsSync(join(projectDir, "src/components/sections/header-sticky.astro")),
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "src/components/sections/footer-columns.astro")),
      ).toBe(true);

      // Install + build the whole site
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // Home page: built artifact + correct content
      const homeHtml = readFileSync(
        join(projectDir, "dist/index.html"),
        "utf8",
      );
      expect(homeHtml).toContain("Calendars that protect deep work"); // hero-text default
      expect(homeHtml).toContain("Built for teams that ship");          // features-grid default
      expect(homeHtml).toContain("Ready to ship your next side project?"); // cta-strip default
      expect(homeHtml).not.toContain("Simple, honest pricing");         // pricing NOT on home

      // Pricing page: built artifact + correct content (Astro builds /pricing
      // as /pricing/index.html when pages are at src/pages/pricing.astro)
      const pricingHtml = readFileSync(
        join(projectDir, "dist/pricing/index.html"),
        "utf8",
      );
      expect(pricingHtml).toContain("Simple, honest pricing");          // pricing-table default
      expect(pricingHtml).toContain("$49");                              // Team tier
      expect(pricingHtml).toContain("Questions everyone asks first");    // faq default
      expect(pricingHtml).not.toContain("Built for teams that ship");    // features NOT on pricing

      // Header + footer appear on BOTH pages
      expect(homeHtml).toContain("fnx-header");
      expect(pricingHtml).toContain("fnx-header");
      expect(homeHtml).toContain("fnx-footer");
      expect(pricingHtml).toContain("fnx-footer");

      // Brand from site.config shows on both
      expect(homeHtml).toContain("Two Page Test");
      expect(pricingHtml).toContain("Two Page Test");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});
