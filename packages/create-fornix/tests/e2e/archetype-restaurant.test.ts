/**
 * Restaurant archetype e2e — proves the terracotta-palette, 4-page
 * wood-fire-kitchen flow:
 *   Home / Menu / About / Contact, with dish bento on Menu and a
 *   sourcing how-it-works on About.
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

describe("v0.3 restaurant archetype", () => {
  it("scaffolds Olea & Sale 4-page site → installs → builds → renders archetype content", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-arch-restaurant-"));
    const projectDir = join(tmp, "olea-sale-test");

    try {
      const archetypeResult = loadArchetype("restaurant");
      expect(archetypeResult.ok, "Failed to load restaurant archetype").toBe(true);
      if (!archetypeResult.ok) return;
      const archetype = archetypeResult.value;
      expect(archetype.palette).toBe("terracotta");

      const paletteResult = loadPaletteData(archetype.palette);
      expect(paletteResult.ok).toBe(true);
      if (!paletteResult.ok) return;
      const palette = paletteResult.value;

      const overlay = archetypeOverlay(archetype, ["en"]);
      expect(overlay.pages).toHaveLength(4);

      const config: ResolvedConfig = {
        projectName: "olea-sale-test",
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
      expect(existsSync(join(projectDir, "src/pages/menu.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/about.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/contact.astro"))).toBe(true);

      // ── Site config ──────────────────────────────────────
      const siteConfig = readFileSync(
        join(projectDir, "src/site.config.ts"),
        "utf8",
      );
      expect(siteConfig).toContain('"name": "Olea & Sale"');
      expect(siteConfig).toContain("wood-fire kitchen");
      expect(siteConfig).toContain("Rua das Salgadeiras 16");

      // ── Install + build ──────────────────────────────────
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // ── Home: hero-media + features + logo-cloud + testimonials + cta ──
      const homeHtml = readFileSync(
        join(projectDir, "dist/index.html"),
        "utf8",
      );
      expect(homeHtml).toContain("A wood-fire kitchen with a Mediterranean accent");
      expect(homeHtml).toContain("How we cook"); // features eyebrow
      expect(homeHtml).toContain("Wood fire, every dish");
      expect(homeHtml).toContain("The Guardian"); // logo-cloud press mention
      expect(homeHtml).toContain("Come find a seat"); // cta
      expect(homeHtml).not.toContain("Built for teams that ship"); // features default OVERRIDDEN

      // ── Menu: features-bento ─────────────────────────────
      const menuHtml = readFileSync(
        join(projectDir, "dist/menu/index.html"),
        "utf8",
      );
      expect(menuHtml).toContain("Tonight"); // bento eyebrow "Tonight's plates"
      expect(menuHtml).toContain("Whole grilled sea bream");
      expect(menuHtml).toContain("Wood-fire octopus");

      // ── About: hero-text + how-it-works ──────────────────
      const aboutHtml = readFileSync(
        join(projectDir, "dist/about/index.html"),
        "utf8",
      );
      expect(aboutHtml).toContain("Twelve seats. Two cooks. One fire.");
      expect(aboutHtml).toContain("A short supply chain"); // how-it-works
      expect(aboutHtml).toContain("Ribeira Market");

      // ── Contact: faq + cta ───────────────────────────────
      const contactHtml = readFileSync(
        join(projectDir, "dist/contact/index.html"),
        "utf8",
      );
      expect(contactHtml).toContain("Questions guests ask");
      expect(contactHtml).toContain("How far in advance should I book?");

      // ── Shared chrome ────────────────────────────────────
      for (const html of [homeHtml, menuHtml, aboutHtml, contactHtml]) {
        expect(html).toContain("fnx-header");
        expect(html).toContain("fnx-footer");
        expect(html).toContain("Olea &amp; Sale");
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});
