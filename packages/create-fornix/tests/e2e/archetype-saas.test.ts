/**
 * SaaS archetype e2e — proves the full archetype path:
 *   archetype JSON → loaded → overlay → ResolvedConfig.pages → multi-page
 *   scaffold → install → build → both pages render with archetype content
 *
 * Verifies the archetype layer doesn't just exist — it actually replaces
 * the block-default content with archetype-specific copy and emits the
 * correct multi-page structure (Home + Pricing).
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
import {
  loadArchetype,
  archetypeOverlay,
} from "../../src/scaffold/archetype.js";
import { loadPaletteData } from "../../src/scaffold/palette.js";

describe("v0.3 saas archetype", () => {
  it("scaffolds Helix two-page site → installs → builds → renders archetype content", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-arch-saas-"));
    const projectDir = join(tmp, "helix-test");

    try {
      // ── Load archetype + palette ─────────────────────────
      const archetypeResult = loadArchetype("saas");
      expect(archetypeResult.ok, "Failed to load saas archetype").toBe(true);
      if (!archetypeResult.ok) return;
      const archetype = archetypeResult.value;

      const paletteResult = loadPaletteData(archetype.palette);
      expect(paletteResult.ok).toBe(true);
      if (!paletteResult.ok) return;
      const palette = paletteResult.value;

      const overlay = archetypeOverlay(archetype, ["en"]);

      const config: ResolvedConfig = {
        projectName: "helix-test",
        projectDir,
        renderMode: "static",
        deployTarget: "static",
        database: "none",
        cssEngine: "vanilla",
        packageManager: "npm",
        blocks: overlay.blockNames.map((name) => ({
          name,
          variant: "default",
        })),
        pages: overlay.pages,
        locales: ["en"],
        defaultLocale: "en",
        palette: { preset: palette.name, colors: palette.colors },
        themeSwitcher: false,
        createdWith: "manual",
      };

      const result = await scaffoldProject(config, {
        archetypeContent: overlay.contentByLocale,
        siteConfigOverrides: overlay.site,
      });
      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);
      if (!result.ok) return;

      // ── Both pages emitted ───────────────────────────────
      expect(
        existsSync(join(projectDir, "src/pages/index.astro")),
        "Home page missing",
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "src/pages/pricing.astro")),
        "Pricing page missing",
      ).toBe(true);

      // ── Site config reflects archetype overrides ─────────
      const siteConfig = readFileSync(
        join(projectDir, "src/site.config.ts"),
        "utf8",
      );
      expect(siteConfig).toContain('"name": "Helix"');
      expect(siteConfig).toContain("Calendars that protect deep work");
      expect(siteConfig).toContain('"helixapp"'); // twitter handle

      // ── Install + build ──────────────────────────────────
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // ── Home: hero + features + how-it-works + testimonials + cta ──
      const homeHtml = readFileSync(
        join(projectDir, "dist/index.html"),
        "utf8",
      );
      expect(homeHtml).toContain("Calendars that protect deep work"); // hero
      expect(homeHtml).toContain("Your calendar, but adversarial to busywork"); // features
      expect(homeHtml).toContain("Auto-blocking when you book up"); // features item
      expect(homeHtml).toContain("Three steps. Day one focus protected."); // how-it-works
      expect(homeHtml).toContain("Maya Patel"); // testimonial author
      expect(homeHtml).toContain("Ready to take your week back?"); // cta
      expect(homeHtml).toContain("Linear"); // logo-cloud
      expect(homeHtml).not.toContain("Built for teams that ship"); // block default OVERRIDDEN

      // ── Pricing: pricing-table + faq + cta ────────────────
      const pricingHtml = readFileSync(
        join(projectDir, "dist/pricing/index.html"),
        "utf8",
      );
      expect(pricingHtml).toContain("Simple, honest pricing");
      expect(pricingHtml).toContain("$49"); // Team tier
      expect(pricingHtml).toContain("Most Popular"); // highlighted plan badge
      expect(pricingHtml).toContain("Questions teams ask before buying"); // faq
      expect(pricingHtml).toContain(
        "Does Helix actually decline meetings on my behalf?",
      ); // faq item
      // Helix brand appears on every page via site.config
      expect(pricingHtml).toContain("Helix");
      // Pricing page does NOT have hero content (no hero block on pricing)
      expect(pricingHtml).not.toContain("Calendars that protect deep work");

      // ── Header + footer on both pages ────────────────────
      expect(homeHtml).toContain("fnx-header");
      expect(pricingHtml).toContain("fnx-header");
      expect(homeHtml).toContain("fnx-footer");
      expect(pricingHtml).toContain("fnx-footer");

      // Footer columns from archetype
      expect(homeHtml).toContain("Changelog"); // Product column
      expect(homeHtml).toContain("Customers"); // Company column
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});
