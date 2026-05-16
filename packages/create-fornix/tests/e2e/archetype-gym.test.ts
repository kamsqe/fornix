/**
 * Gym archetype e2e — proves the ember-palette, 4-page strength-gym flow:
 *   Home / Classes / Pricing / Contact, with stats-strip social proof
 *   and a pricing table on the pricing page.
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

describe("v0.3 gym archetype", () => {
  it("scaffolds Iron Forge 4-page site → installs → builds → renders archetype content", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-arch-gym-"));
    const projectDir = join(tmp, "iron-forge-test");

    try {
      const archetypeResult = loadArchetype("gym");
      expect(archetypeResult.ok, "Failed to load gym archetype").toBe(true);
      if (!archetypeResult.ok) return;
      const archetype = archetypeResult.value;
      expect(archetype.palette).toBe("ember");

      const paletteResult = loadPaletteData(archetype.palette);
      expect(paletteResult.ok).toBe(true);
      if (!paletteResult.ok) return;
      const palette = paletteResult.value;

      const overlay = archetypeOverlay(archetype, ["en"]);
      expect(overlay.pages).toHaveLength(4);

      const config: ResolvedConfig = {
        projectName: "iron-forge-test",
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

      // ── Four pages emitted ───────────────────────────────
      expect(existsSync(join(projectDir, "src/pages/index.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/classes.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/pricing.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/contact.astro"))).toBe(true);

      // ── Site config ──────────────────────────────────────
      const siteConfig = readFileSync(
        join(projectDir, "src/site.config.ts"),
        "utf8",
      );
      expect(siteConfig).toContain('"name": "Iron Forge"');
      expect(siteConfig).toContain("serious gym");
      expect(siteConfig).toContain("1411 Folsom");

      // ── Install + build ──────────────────────────────────
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // ── Home: hero-media + stats + how-it-works + testimonials + cta ──
      const homeHtml = readFileSync(
        join(projectDir, "dist/index.html"),
        "utf8",
      );
      expect(homeHtml).toContain("A serious gym for people who lift heavy");
      expect(homeHtml).toContain("1,400"); // stats-strip
      expect(homeHtml).toContain("Three steps. Lift this week."); // how-it-works
      expect(homeHtml).toContain("Five days, no card"); // cta
      expect(homeHtml).not.toContain("The intern your whole team trusts"); // hero-media default OVERRIDDEN

      // ── Classes: features-grid + testimonials ────────────
      const classesHtml = readFileSync(
        join(projectDir, "dist/classes/index.html"),
        "utf8",
      );
      expect(classesHtml).toContain("Six ways to train at Iron Forge");
      expect(classesHtml).toContain("Strength · 60 min");
      expect(classesHtml).toContain("Olympic Lifts · 75 min");

      // ── Pricing: pricing-table + faq ─────────────────────
      const pricingHtml = readFileSync(
        join(projectDir, "dist/pricing/index.html"),
        "utf8",
      );
      expect(pricingHtml).toContain("Pick a cadence, start the work");
      expect(pricingHtml).toContain("$240"); // Unlimited plan
      expect(pricingHtml).toContain("Most Popular");
      expect(pricingHtml).toContain("Questions before joining"); // faq
      expect(pricingHtml).toContain("never lifted with a barbell"); // faq item (apostrophe avoided)

      // ── Contact: hero-text + cta ─────────────────────────
      const contactHtml = readFileSync(
        join(projectDir, "dist/contact/index.html"),
        "utf8",
      );
      expect(contactHtml).toContain("Come see the room");
      expect(contactHtml).toContain("1411 Folsom Street");

      // ── Shared chrome ────────────────────────────────────
      for (const html of [homeHtml, classesHtml, pricingHtml, contactHtml]) {
        expect(html).toContain("fnx-header");
        expect(html).toContain("fnx-footer");
        expect(html).toContain("Iron Forge");
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});
