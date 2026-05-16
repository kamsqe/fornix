/**
 * Portfolio archetype e2e — proves the fraktur-palette, 3-page designer flow:
 *   Home / Projects / Contact, with bento case-studies on Home and a
 *   grid project list on Projects.
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

describe("v0.3 portfolio archetype", () => {
  it("scaffolds Lior Halevi 3-page site → installs → builds → renders archetype content", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-arch-portfolio-"));
    const projectDir = join(tmp, "lior-halevi-test");

    try {
      const archetypeResult = loadArchetype("portfolio");
      expect(archetypeResult.ok, "Failed to load portfolio archetype").toBe(true);
      if (!archetypeResult.ok) return;
      const archetype = archetypeResult.value;
      expect(archetype.palette).toBe("fraktur");

      const paletteResult = loadPaletteData(archetype.palette);
      expect(paletteResult.ok).toBe(true);
      if (!paletteResult.ok) return;
      const palette = paletteResult.value;

      const overlay = archetypeOverlay(archetype, ["en"]);
      expect(overlay.pages).toHaveLength(3);

      const config: ResolvedConfig = {
        projectName: "lior-halevi-test",
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

      // ── Three pages emitted ──────────────────────────────
      expect(existsSync(join(projectDir, "src/pages/index.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/projects.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/contact.astro"))).toBe(true);

      // ── Site config ──────────────────────────────────────
      const siteConfig = readFileSync(
        join(projectDir, "src/site.config.ts"),
        "utf8",
      );
      expect(siteConfig).toContain('"name": "Lior Halevi"');
      expect(siteConfig).toContain("Independent product designer");
      expect(siteConfig).toContain('"liorhalevi"');

      // ── Install + build ──────────────────────────────────
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // ── Home: hero-text + features-bento + testimonials + cta ──
      const homeHtml = readFileSync(
        join(projectDir, "dist/index.html"),
        "utf8",
      );
      expect(homeHtml).toContain("Tools for serious people");
      expect(homeHtml).toContain("Eight projects worth showing"); // bento
      expect(homeHtml).toContain("Sextant"); // bento item
      expect(homeHtml).toContain("Hire me for your next project"); // cta
      expect(homeHtml).not.toContain("Calendars that protect deep work"); // hero-text default OVERRIDDEN

      // ── Projects: features-grid + testimonials ───────────
      const projectsHtml = readFileSync(
        join(projectDir, "dist/projects/index.html"),
        "utf8",
      );
      expect(projectsHtml).toContain("Twelve years of selected work");
      expect(projectsHtml).toContain("Sextant Trading Terminal");
      expect(projectsHtml).toContain("Helix Calendar");
      expect(projectsHtml).toContain("Vault HQ");

      // ── Contact: faq + cta ───────────────────────────────
      const contactHtml = readFileSync(
        join(projectDir, "dist/contact/index.html"),
        "utf8",
      );
      expect(contactHtml).toContain("Questions before we talk");
      expect(contactHtml).toContain("What kinds of projects do you take on?");

      // ── Shared chrome ────────────────────────────────────
      for (const html of [homeHtml, projectsHtml, contactHtml]) {
        expect(html).toContain("fnx-header");
        expect(html).toContain("fnx-footer");
        expect(html).toContain("Lior Halevi");
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});
