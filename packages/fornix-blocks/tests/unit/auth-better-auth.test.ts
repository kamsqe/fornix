import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

describe("auth-better-auth block", () => {
  const blockDir = join(BLOCKS_DIR, "auth-better-auth");

  describe("block.json", () => {
    it("parses against BlockManifestSchema", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      const result = BlockManifestSchema.safeParse(parsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("auth-better-auth");
        expect(result.data.type).toBe("integration");
        expect(result.data.category).toBe("auth");
      }
    });

    it("requires server mode", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.requiredMode).toBe("server");
    });

    it("requires db-d1 dependency", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.requires).toContain("db-d1");
    });

    it("has better-auth npm dependency", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.dependencies["better-auth"]).toBeDefined();
    });

    it("declares required env vars", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      const envNames = parsed.envVars.map((v: { name: string }) => v.name);
      expect(envNames).toContain("AUTH_SECRET");
      expect(envNames).toContain("GITHUB_CLIENT_ID");
      expect(envNames).toContain("GITHUB_CLIENT_SECRET");
    });

    it("has 5 output files", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.files.length).toBe(5);

      const destinations = parsed.files.map(
        (f: { destination: string }) => f.destination
      );
      expect(destinations).toContain("src/lib/auth.ts");
      expect(destinations).toContain("src/middleware/auth.ts");
      expect(destinations).toContain("src/pages/api/auth/[...all].ts");
      expect(destinations).toContain("src/pages/login.astro");
      expect(destinations).toContain("src/pages/signup.astro");
    });

    it("has AI metadata that pairs with db-d1", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.pairsWith).toContain("db-d1");
    });
  });

  describe("source files", () => {
    it("auth.ts exists and uses better-auth", () => {
      const content = readFileSync(join(blockDir, "auth.ts"), "utf-8");
      expect(content).toContain("betterAuth");
      expect(content).toContain("D1Database");
      expect(content).toContain("emailAndPassword");
      expect(content).toContain("github");
    });

    it("middleware.ts exists and imports createAuth", () => {
      const content = readFileSync(join(blockDir, "middleware.ts"), "utf-8");
      expect(content).toContain("createAuth");
      expect(content).toContain("MiddlewareHandler");
      expect(content).toContain("session");
    });

    it("auth-api.ts exists as catch-all route", () => {
      const content = readFileSync(join(blockDir, "auth-api.ts"), "utf-8");
      expect(content).toContain("APIRoute");
      expect(content).toContain("createAuth");
      expect(content).toContain("auth.handler");
    });

    it("login.astro exists with content collection", () => {
      const content = readFileSync(join(blockDir, "login.astro"), "utf-8");
      expect(content).toContain("getEntry");
      expect(content).toContain("auth-login");
    });

    it("signup.astro exists with content collection", () => {
      const content = readFileSync(join(blockDir, "signup.astro"), "utf-8");
      expect(content).toContain("getEntry");
      expect(content).toContain("auth-signup");
    });
  });
});
