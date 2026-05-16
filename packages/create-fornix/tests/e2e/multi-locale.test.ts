/**
 * Multi-locale e2e — proves the audit blocker "blocks can't find
 * locale-namespaced content" is fixed end-to-end.
 *
 * Scaffolds a project with `locales: ["en", "es"]` + a mock AI provider
 * that returns DIFFERENT content per locale. Builds. Curls both / and /es/.
 * Asserts each page renders its own locale's copy.
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
  createMockProvider,
  type ResolvedConfig,
  type BrandContext,
} from "../../src/index.js";

const EN_HEADLINE = "Ship faster with confidence";
const EN_FOOTER_TAGLINE = "© 2026 Lexura Legal Inc.";
const ES_HEADLINE = "Lanza más rápido con confianza";
const ES_FOOTER_TAGLINE = "© 2026 Lexura Legal Inc. — España";

function makeConfig(projectDir: string): ResolvedConfig {
  return {
    projectName: "i18n-test",
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: [
      { name: "hero-text", variant: "default" },
      { name: "footer-columns", variant: "default" },
    ],
    locales: ["en", "es"],
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
    createdWith: "ai",
  };
}

const brand: BrandContext = {
  name: "Lexura",
  description: "AI-powered commercial dispute resolution",
  tone: "professional, trustworthy",
  industry: "legal-tech",
};

describe("v2 multi-locale", () => {
  it("scaffolds en + es → each page renders its own locale's copy", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-i18n-"));
    const projectDir = join(tmp, "site");

    try {
      // Mock provider with locale-keyed responses. Key form `{block}:{locale}`
      // overrides the generic `{block}` key.
      const provider = createMockProvider({
        "hero-text:en": {
          eyebrow: "Beta",
          headline: EN_HEADLINE,
          subheadline: "Lexura resolves commercial disputes in days, not months.",
          primaryCtaText: "Start a case",
          primaryCtaHref: "#start",
        },
        "hero-text:es": {
          eyebrow: "Beta",
          headline: ES_HEADLINE,
          subheadline:
            "Lexura resuelve disputas comerciales en días, no meses.",
          primaryCtaText: "Iniciar un caso",
          primaryCtaHref: "#start",
        },
        "footer-columns:en": {
          tagline: EN_FOOTER_TAGLINE,
          navAriaLabel: "Footer",
        },
        "footer-columns:es": {
          tagline: ES_FOOTER_TAGLINE,
          navAriaLabel: "Pie",
        },
      });

      const result = await scaffoldProject(makeConfig(projectDir), {
        provider,
        brand,
      });
      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);
      if (!result.ok) return;

      // Content was written under sections/{locale}/{block}.json
      expect(
        existsSync(
          join(projectDir, "src/content/sections/en/hero-text.json"),
        ),
      ).toBe(true);
      expect(
        existsSync(
          join(projectDir, "src/content/sections/es/hero-text.json"),
        ),
      ).toBe(true);

      // Pages: default at src/pages/index.astro, non-default at src/pages/es/index.astro
      expect(existsSync(join(projectDir, "src/pages/index.astro"))).toBe(true);
      expect(existsSync(join(projectDir, "src/pages/es/index.astro"))).toBe(
        true,
      );

      // Install + build
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      // English page (default locale at /)
      const enHtml = readFileSync(
        join(projectDir, "dist", "index.html"),
        "utf8",
      );
      expect(enHtml).toContain(EN_HEADLINE);
      expect(enHtml).toContain(EN_FOOTER_TAGLINE);
      expect(enHtml).not.toContain(ES_HEADLINE);

      // Spanish page (at /es/)
      const esHtml = readFileSync(
        join(projectDir, "dist", "es", "index.html"),
        "utf8",
      );
      expect(esHtml).toContain(ES_HEADLINE);
      expect(esHtml).toContain(ES_FOOTER_TAGLINE);
      expect(esHtml).not.toContain(EN_HEADLINE);

      // Palette CSS linked in both
      expect(enHtml).toContain('id="fornix-palette-link"');
      expect(esHtml).toContain('id="fornix-palette-link"');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);
});
