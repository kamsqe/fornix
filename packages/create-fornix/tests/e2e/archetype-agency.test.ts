/**
 * Agency archetype e2e — proves the paper-palette, 4-page agency flow:
 *   Home / Work / About / Contact, each with its own archetype copy.
 *
 * Verifies the archetype layer for "Atelier North" — pages are routed,
 * archetype overrides win over block defaults, and the FAQ on Contact
 * gets its own archetype content (not the default deploy-platform copy).
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

describe("v0.3 agency archetype", () => {
  it("scaffolds Atelier North 4-page site → installs → builds → renders archetype content", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-arch-agency-"));
    const projectDir = join(tmp, "atelier-north-test");

    try {
      // ── Load archetype + palette ─────────────────────────
      const archetypeResult = loadArchetype("agency");
      expect(archetypeResult.ok, "Failed to load agency archetype").toBe(true);
      if (!archetypeResult.ok) return;
      const archetype = archetypeResult.value;
      expect(archetype.palette).toBe("paper");

      const paletteResult = loadPaletteData(archetype.palette);
      expect(paletteResult.ok).toBe(true);
      if (!paletteResult.ok) return;
      const palette = paletteResult.value;

      const overlay = archetypeOverlay(archetype, ["en"]);
      expect(overlay.pages).toHaveLength(4);

      const config: ResolvedConfig = {
        projectName: "atelier-north-test",
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

      // ── All four pages emitted ───────────────────────────
      expect(existsSync(join(projectDir, "src/pages/index.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/work.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/about.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/contact.astro"))).toBe(true);

      // ── Site config reflects archetype overrides ─────────
      const siteConfig = readFileSync(
        join(projectDir, "src/site.config.ts"),
        "utf8",
      );
      expect(siteConfig).toContain('"name": "Atelier North"');
      expect(siteConfig).toContain("A branding & product studio"); // tagline
      expect(siteConfig).toContain('"ateliernorth"'); // twitter handle
      expect(siteConfig).toContain("hello@ateliernorth.studio");

      // ── Install + build ──────────────────────────────────
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // ── Home: hero-media + features + how-it-works + testimonials + cta ──
      const homeHtml = readFileSync(
        join(projectDir, "dist/index.html"),
        "utf8",
      );
      expect(homeHtml).toContain("Identity, product, and packaging"); // hero
      expect(homeHtml).toContain("Three disciplines, one studio"); // features
      expect(homeHtml).toContain("Brand identity"); // features item
      expect(homeHtml).toContain("A six-month engagement"); // how-it-works
      expect(homeHtml).toContain("Maya Patel"); // testimonial author
      expect(homeHtml).toContain("Have a project in mind?"); // cta
      expect(homeHtml).toContain("Lexura"); // logo-cloud
      expect(homeHtml).not.toContain("Built for teams that ship"); // block default OVERRIDDEN

      // ── Work: features-bento + testimonials ──────────────
      const workHtml = readFileSync(
        join(projectDir, "dist/work/index.html"),
        "utf8",
      );
      expect(workHtml).toContain("Selected work"); // bento eyebrow
      expect(workHtml).toContain("Lexura"); // bento case-study item
      expect(workHtml).toContain("Norrbro — packaging");

      // ── About: hero-text + stats-strip ───────────────────
      const aboutHtml = readFileSync(
        join(projectDir, "dist/about/index.html"),
        "utf8",
      );
      expect(aboutHtml).toContain("Eight people. A converted bakery.");
      expect(aboutHtml).toContain("People in the studio"); // stats-strip label

      // ── Contact: faq + cta ───────────────────────────────
      const contactHtml = readFileSync(
        join(projectDir, "dist/contact/index.html"),
        "utf8",
      );
      expect(contactHtml).toContain("Questions clients ask in the first email");
      expect(contactHtml).toContain("How long is a typical engagement?"); // faq item
      expect(contactHtml).toContain("Have a project in mind?"); // cta

      // ── Header + footer on every page ────────────────────
      for (const html of [homeHtml, workHtml, aboutHtml, contactHtml]) {
        expect(html).toContain("fnx-header");
        expect(html).toContain("fnx-footer");
        expect(html).toContain("Atelier North");
      }

      // Footer column from archetype
      expect(homeHtml).toContain("Brand identity"); // Services column link
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});
