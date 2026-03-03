import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

describe("db-d1 block", () => {
  const blockDir = join(BLOCKS_DIR, "db-d1");

  describe("block.json", () => {
    it("parses against BlockManifestSchema", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      const result = BlockManifestSchema.safeParse(parsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("db-d1");
        expect(result.data.type).toBe("integration");
        expect(result.data.category).toBe("database");
      }
    });

    it("requires server mode", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.requiredMode).toBe("server");
    });

    it("has drizzle-orm dependency", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.dependencies["drizzle-orm"]).toBeDefined();
      expect(parsed.dependencies["drizzle-kit"]).toBeDefined();
    });

    it("declares D1_DATABASE_ID env var", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.envVars.length).toBeGreaterThan(0);
      const d1Var = parsed.envVars.find(
        (v: { name: string }) => v.name === "D1_DATABASE_ID"
      );
      expect(d1Var).toBeDefined();
      expect(d1Var.required).toBe(true);
    });

    it("has 4 output files", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.files.length).toBe(4);

      const destinations = parsed.files.map(
        (f: { destination: string }) => f.destination
      );
      expect(destinations).toContain("src/lib/db.ts");
      expect(destinations).toContain("src/lib/db-schema.ts");
      expect(destinations).toContain("drizzle.config.ts");
      expect(destinations).toContain("drizzle/migrations/.gitkeep");
    });

    it("has AI metadata", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.whenToUse).toBeTruthy();
      expect(parsed.ai.pairsWith).toContain("auth-better-auth");
    });
  });

  describe("source files", () => {
    it("db.ts exists and uses drizzle-orm", () => {
      const content = readFileSync(join(blockDir, "db.ts"), "utf-8");
      expect(content).toContain("drizzle-orm");
      expect(content).toContain("D1Database");
      expect(content).toContain("getDb");
    });

    it("schema.ts exists", () => {
      expect(existsSync(join(blockDir, "schema.ts"))).toBe(true);
    });

    it("drizzle.config.ts exists and points to correct schema path", () => {
      const content = readFileSync(join(blockDir, "drizzle.config.ts"), "utf-8");
      expect(content).toContain("db-schema.ts");
      expect(content).toContain("sqlite");
      expect(content).toContain("drizzle/migrations");
    });

    it("migrations/.gitkeep exists", () => {
      expect(existsSync(join(blockDir, "migrations", ".gitkeep"))).toBe(true);
    });
  });
});
