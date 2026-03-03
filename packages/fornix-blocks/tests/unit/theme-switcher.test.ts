import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

describe("theme-switcher block", () => {
  const blockDir = join(BLOCKS_DIR, "theme-switcher");

  describe("block.json", () => {
    it("parses against BlockManifestSchema", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      const result = BlockManifestSchema.safeParse(parsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("theme-switcher");
        expect(result.data.type).toBe("section");
        expect(result.data.category).toBe("theme");
      }
    });

    it("has AI metadata", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.whenToUse).toBeTruthy();
      expect(parsed.ai.contentSlots.label).toBeDefined();
    });

    it("has files array with correct destinations", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.files.length).toBe(2);
      expect(parsed.files[0].destination).toBe("src/components/sections/theme-switcher.astro");
      expect(parsed.files[1].destination).toBe("src/styles/sections/theme-switcher.css");
    });
  });

  describe("theme-switcher.astro", () => {
    it("reads content from content collection", () => {
      const astro = readFileSync(join(blockDir, "theme-switcher.astro"), "utf-8");
      expect(astro).toContain("getEntry");
      expect(astro).toContain("sections");
      expect(astro).toContain("theme-switcher");
    });

    it("contains client-side script for palette switching", () => {
      const astro = readFileSync(join(blockDir, "theme-switcher.astro"), "utf-8");
      expect(astro).toContain("<script>");
      expect(astro).toContain("__fornixPalettes");
      expect(astro).toContain("__fornixSwitchPalette");
      expect(astro).toContain("localStorage");
    });

    it("has accessible toggle button", () => {
      const astro = readFileSync(join(blockDir, "theme-switcher.astro"), "utf-8");
      expect(astro).toContain("aria-label");
      expect(astro).toContain("aria-expanded");
      expect(astro).toContain("aria-haspopup");
      expect(astro).toContain('role="listbox"');
    });

    it("has keyboard interaction support", () => {
      const astro = readFileSync(join(blockDir, "theme-switcher.astro"), "utf-8");
      expect(astro).toContain("Escape");
    });
  });

  describe("theme-switcher.css", () => {
    it("uses CSS custom properties for colors", () => {
      const css = readFileSync(join(blockDir, "theme-switcher.css"), "utf-8");
      expect(css).toContain("var(--color-");
    });

    it("is positioned fixed for floating UI", () => {
      const css = readFileSync(join(blockDir, "theme-switcher.css"), "utf-8");
      expect(css).toContain("position: fixed");
    });

    it("has animated dropdown", () => {
      const css = readFileSync(join(blockDir, "theme-switcher.css"), "utf-8");
      expect(css).toContain("transition");
      expect(css).toContain("theme-switcher__menu--open");
    });

    it("is responsive", () => {
      const css = readFileSync(join(blockDir, "theme-switcher.css"), "utf-8");
      expect(css).toContain("@media");
    });
  });

  describe("default-content.json", () => {
    it("has label field", () => {
      const raw = readFileSync(join(blockDir, "default-content.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.label).toBeTruthy();
    });
  });

  describe("no CSS collisions with other blocks", () => {
    it("theme-switcher CSS classes don't collide with hero, footer, or features", () => {
      const blocks = ["hero-gradient", "footer-minimal", "features-grid", "theme-switcher"];
      const classesByBlock: Record<string, Set<string>> = {};

      for (const blockName of blocks) {
        const css = readFileSync(join(BLOCKS_DIR, blockName, `${blockName}.css`), "utf-8");
        const classNames = new Set<string>();
        for (const match of css.matchAll(/\.([a-z][a-z0-9_-]+)/g)) {
          classNames.add(match[1]);
        }
        classesByBlock[blockName] = classNames;
      }

      // Check theme-switcher against all others
      const switcherClasses = classesByBlock["theme-switcher"];
      for (const other of ["hero-gradient", "footer-minimal", "features-grid"]) {
        const otherClasses = classesByBlock[other];
        const overlap = new Set([...switcherClasses].filter((c) => otherClasses.has(c)));
        expect(
          overlap.size,
          `CSS collision between theme-switcher and ${other}: ${[...overlap].join(", ")}`
        ).toBe(0);
      }
    });
  });
});
