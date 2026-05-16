/**
 * site.config.ts emission — verifies every scaffold ships a populated
 * `src/site.config.ts` that future blocks will read for site-wide data.
 *
 * The actual block-level consumption arrives in v0.3 week 2 when blocks
 * get rewritten; this test gates the plumbing.
 */
import { describe, it, expect } from "vitest";
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

function makeConfig(projectDir: string, projectName: string): ResolvedConfig {
  return {
    projectName,
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: [{ name: "hero-text", variant: "default" }],
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

describe("v0.3 site.config.ts emission", () => {
  it("emits src/site.config.ts with sensible defaults derived from project name", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-siteconfig-"));
    const projectDir = join(tmp, "site");
    try {
      const result = await scaffoldProject(makeConfig(projectDir, "iron-forge"));
      expect(result.ok).toBe(true);

      const siteConfigPath = join(projectDir, "src", "site.config.ts");
      expect(existsSync(siteConfigPath), "src/site.config.ts not emitted").toBe(true);

      const contents = readFileSync(siteConfigPath, "utf8");

      // Type definition is present so AI editors get autocomplete.
      expect(contents).toContain("export interface SiteConfig");
      expect(contents).toContain("export const site:");

      // Project name humanized: iron-forge → "Iron Forge"
      expect(contents).toContain('"name": "Iron Forge"');

      // Logo monogram derived from name initials.
      expect(contents).toMatch(/"text":\s*"IF"/);

      // Copyright reflects current year + name.
      const year = new Date().getUTCFullYear();
      expect(contents).toContain(`© ${year} Iron Forge`);

      // Locale config from ResolvedConfig.
      expect(contents).toContain('"default": "en"');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("monogram falls back to first letter when project name is one word", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-siteconfig-mono-"));
    const projectDir = join(tmp, "site");
    try {
      const result = await scaffoldProject(makeConfig(projectDir, "helix"));
      expect(result.ok).toBe(true);

      const contents = readFileSync(
        join(projectDir, "src", "site.config.ts"),
        "utf8",
      );
      expect(contents).toMatch(/"text":\s*"H"/);
      expect(contents).toContain('"name": "Helix"');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("multi-locale: supported locales reflect ResolvedConfig.locales", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-siteconfig-i18n-"));
    const projectDir = join(tmp, "site");
    try {
      const config = makeConfig(projectDir, "helix");
      const result = await scaffoldProject({
        ...config,
        locales: ["en", "es", "fr"],
      });
      expect(result.ok).toBe(true);

      const contents = readFileSync(
        join(projectDir, "src", "site.config.ts"),
        "utf8",
      );
      expect(contents).toContain('"en"');
      expect(contents).toContain('"es"');
      expect(contents).toContain('"fr"');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
