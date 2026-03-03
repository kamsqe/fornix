import { describe, it, expect } from "vitest";
import { BlockManifestSchema } from "fornix-registry";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

describe("Feature Blocks", () => {
  describe("blog-mdx", () => {
    const blockDir = resolve(process.cwd(), "blocks/blog-mdx");
    const manifestPath = resolve(blockDir, "block.json");

    it("has a valid manifest", () => {
      expect(existsSync(manifestPath)).toBe(true);
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);

      const result = BlockManifestSchema.safeParse(json);
      if (!result.success) {
        console.error(result.error);
      }
      expect(result.success).toBe(true);
      expect(json.type).toBe("feature");
      expect(json.name).toBe("blog-mdx");
    });

    it("has required dependencies", () => {
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);
      expect(json.dependencies).toBeDefined();
      expect(json.dependencies["@astrojs/mdx"]).toBeDefined();
      expect(json.dependencies["@astrojs/rss"]).toBeDefined();
    });

    it("has required components and files", () => {
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);
      
      const fileSources = json.files.map((f: any) => f.source);
      expect(fileSources).toContain("schema.ts");
      expect(fileSources).toContain("pages/index.astro");
      expect(fileSources).toContain("pages/[slug].astro");
      expect(fileSources).toContain("pages/rss.xml.ts");

      for (const source of fileSources) {
        expect(existsSync(resolve(blockDir, source))).toBe(true);
      }
    });

    it("has collections property defined", () => {
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);
      expect(json.collections).toBeDefined();
      expect(json.collections.length).toBeGreaterThan(0);
      expect(json.collections[0].name).toBe("blog");
      expect(json.collections[0].type).toBe("content");
    });
  });

  describe("docs-collection", () => {
    const blockDir = resolve(process.cwd(), "blocks/docs-collection");
    const manifestPath = resolve(blockDir, "block.json");

    it("has a valid manifest", () => {
      expect(existsSync(manifestPath)).toBe(true);
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);

      const result = BlockManifestSchema.safeParse(json);
      if (!result.success) {
        console.error(result.error);
      }
      expect(result.success).toBe(true);
      expect(json.type).toBe("feature");
      expect(json.name).toBe("docs-collection");
    });

    it("has required dependencies", () => {
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);
      expect(json.dependencies).toBeDefined();
      expect(json.dependencies["@astrojs/mdx"]).toBeDefined();
    });

    it("has required components and files", () => {
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);
      
      const fileSources = json.files.map((f: any) => f.source);
      expect(fileSources).toContain("schema.ts");
      expect(fileSources).toContain("pages/[...slug].astro");

      for (const source of fileSources) {
        expect(existsSync(resolve(blockDir, source))).toBe(true);
      }
    });

    it("has collections property defined", () => {
      const content = readFileSync(manifestPath, "utf-8");
      const json = JSON.parse(content);
      expect(json.collections).toBeDefined();
      expect(json.collections.length).toBeGreaterThan(0);
      expect(json.collections[0].name).toBe("docs");
      expect(json.collections[0].type).toBe("content");
    });
  });
});
