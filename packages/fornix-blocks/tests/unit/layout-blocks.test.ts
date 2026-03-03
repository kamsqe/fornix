import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

function readJsonFile(path: string) {
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

describe("Layout Blocks", () => {
  const blocksDir = join(__dirname, "../../blocks");

  describe("layout-marketing", () => {
    const blockDir = join(blocksDir, "layout-marketing");
    const manifestPath = join(blockDir, "block.json");

    it("has a valid manifest", () => {
      const manifestData = readJsonFile(manifestPath);
      const result = BlockManifestSchema.safeParse(manifestData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("layout");
        expect(result.data.name).toBe("layout-marketing");
      }
    });

    it("has required files", () => {
      const manifestData = readJsonFile(manifestPath);
      for (const file of manifestData.files || []) {
        const filePath = join(blockDir, file.source);
        expect(existsSync(filePath)).toBe(true);
      }
    });
    
    it("has default content", () => {
       const contentPath = join(blockDir, "default-content.json");
       expect(existsSync(contentPath)).toBe(true);
       const content = readJsonFile(contentPath);
       expect(content.headerLinks).toBeDefined();
       expect(content.footerText).toBeDefined();
    });
  });

  describe("layout-docs", () => {
    const blockDir = join(blocksDir, "layout-docs");
    const manifestPath = join(blockDir, "block.json");

    it("has a valid manifest", () => {
      const manifestData = readJsonFile(manifestPath);
      const result = BlockManifestSchema.safeParse(manifestData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("layout");
        expect(result.data.name).toBe("layout-docs");
      }
    });

    it("has required files", () => {
      const manifestData = readJsonFile(manifestPath);
      for (const file of manifestData.files || []) {
        const filePath = join(blockDir, file.source);
        expect(existsSync(filePath)).toBe(true);
      }
    });

    it("has default content", () => {
       const contentPath = join(blockDir, "default-content.json");
       expect(existsSync(contentPath)).toBe(true);
       const content = readJsonFile(contentPath);
       expect(content.headerTitle).toBeDefined();
       expect(content.footerText).toBeDefined();
    });
  });

  describe("layout-dashboard", () => {
    const blockDir = join(blocksDir, "layout-dashboard");
    const manifestPath = join(blockDir, "block.json");

    it("has a valid manifest", () => {
      const manifestData = readJsonFile(manifestPath);
      const result = BlockManifestSchema.safeParse(manifestData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("layout");
        expect(result.data.name).toBe("layout-dashboard");
        expect(result.data.requiredMode).toBe("server");
        expect(result.data.requires).toContain("auth-better-auth");
      }
    });

    it("has required files", () => {
      const manifestData = readJsonFile(manifestPath);
      for (const file of manifestData.files || []) {
        const filePath = join(blockDir, file.source);
        expect(existsSync(filePath)).toBe(true);
      }
    });

    it("has default content", () => {
       const contentPath = join(blockDir, "default-content.json");
       expect(existsSync(contentPath)).toBe(true);
       const content = readJsonFile(contentPath);
       expect(content.sidebarLinks).toBeDefined();
       expect(content.logoutText).toBeDefined();
    });
  });
});
