/**
 * Primitives emission e2e — verifies every scaffold receives the full
 * primitive set under `src/components/primitives/`.
 *
 * Day 6+ blocks will import from these; this test gates the plumbing.
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

const REQUIRED_PRIMITIVES = [
  "Container.astro",
  "Section.astro",
  "Headline.astro",
  "Eyebrow.astro",
  "Button.astro",
  "Card.astro",
  "Badge.astro",
  "Icon.astro",
];

function makeConfig(projectDir: string): ResolvedConfig {
  return {
    projectName: "prim-test",
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

describe("v0.3 primitives emission", () => {
  it("every scaffold ships the full primitive set", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-prim-"));
    const projectDir = join(tmp, "site");

    try {
      const result = await scaffoldProject(makeConfig(projectDir));
      expect(result.ok).toBe(true);

      const primDir = join(projectDir, "src", "components", "primitives");

      // Themed primitives — must reference palette CSS variables (proves
      // they're actually palette-aware, not just shipping inert markup).
      // Container = layout only. Icon = uses currentColor.
      const THEMED = new Set([
        "Section.astro",
        "Headline.astro",
        "Eyebrow.astro",
        "Button.astro",
        "Card.astro",
        "Badge.astro",
      ]);

      for (const name of REQUIRED_PRIMITIVES) {
        const path = join(primDir, name);
        expect(existsSync(path), `Missing primitive: ${name}`).toBe(true);

        const contents = readFileSync(path, "utf8");
        expect(contents.length, `Primitive ${name} appears empty`).toBeGreaterThan(200);

        // Every primitive declares its props interface (AI editor lifebuoy).
        expect(
          contents,
          `Primitive ${name} doesn't declare a Props interface`,
        ).toContain("interface Props");

        if (THEMED.has(name)) {
          expect(
            contents,
            `Themed primitive ${name} doesn't reference a palette CSS variable`,
          ).toMatch(/var\(--(color|font|radius|duration|easing|shadow)-/);
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
