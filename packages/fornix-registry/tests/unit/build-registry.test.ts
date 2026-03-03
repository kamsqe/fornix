import { describe, it, expect } from "vitest";
import { join, resolve } from "node:path";
import { readdirSync } from "node:fs";
import { buildRegistry } from "../../scripts/build-registry.js";
import type { RegistryIndex } from "../../scripts/build-registry.js";

const BLOCKS_DIR = resolve(__dirname, "../../../fornix-blocks/blocks");
const PALETTES_DIR = resolve(__dirname, "../../palettes");

describe("build-registry", () => {
  let result: ReturnType<typeof buildRegistry>;

  // Build once for all tests
  result = buildRegistry(BLOCKS_DIR, PALETTES_DIR);

  describe("output structure", () => {
    it("produces valid JSON-serializable output", () => {
      const json = JSON.stringify(result.registry);
      const parsed: RegistryIndex = JSON.parse(json);
      expect(parsed.version).toBe(1);
      expect(parsed.generatedAt).toBeTruthy();
      expect(Array.isArray(parsed.blocks)).toBe(true);
      expect(Array.isArray(parsed.palettes)).toBe(true);
    });

    it("has no build errors", () => {
      expect(result.errors).toEqual([]);
    });
  });

  describe("blocks", () => {
    it("includes all blocks from fornix-blocks/blocks/", () => {
      const blockDirs = readdirSync(BLOCKS_DIR).filter((d) => {
        return readdirSync(join(BLOCKS_DIR, d)).includes("block.json");
      });

      expect(result.registry.blocks.length).toBe(blockDirs.length);

      const indexedNames = result.registry.blocks.map((b) => b.name);
      for (const dir of blockDirs) {
        expect(indexedNames, `Missing block: ${dir}`).toContain(dir);
      }
    });

    it("includes hero-gradient, footer-minimal, features-grid, theme-switcher, db-d1, auth-better-auth", () => {
      const names = result.registry.blocks.map((b) => b.name);
      expect(names).toContain("hero-gradient");
      expect(names).toContain("footer-minimal");
      expect(names).toContain("features-grid");
      expect(names).toContain("theme-switcher");
      expect(names).toContain("db-d1");
      expect(names).toContain("auth-better-auth");
    });

    it("has no duplicate block names", () => {
      const names = result.registry.blocks.map((b) => b.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it("blocks are sorted alphabetically", () => {
      const names = result.registry.blocks.map((b) => b.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });

  describe("palettes", () => {
    it("includes all palettes from fornix-registry/palettes/", () => {
      const paletteFiles = readdirSync(PALETTES_DIR).filter((f) =>
        f.endsWith(".json")
      );

      expect(result.registry.palettes.length).toBe(paletteFiles.length);
    });

    it("includes known palettes (midnight, arctic, forest)", () => {
      const names = result.registry.palettes.map((p) => p.name);
      expect(names).toContain("midnight");
      expect(names).toContain("arctic");
      expect(names).toContain("forest");
    });

    it("has no duplicate palette names", () => {
      const names = result.registry.palettes.map((p) => p.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it("palettes are sorted alphabetically", () => {
      const names = result.registry.palettes.map((p) => p.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });
});
