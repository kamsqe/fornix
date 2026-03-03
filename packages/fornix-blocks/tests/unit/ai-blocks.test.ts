import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

describe("runtime AI blocks (phase 50)", () => {
  describe("ai-chatbot", () => {
    const blockDir = join(BLOCKS_DIR, "ai-chatbot");

    describe("block.json", () => {
      it("parses against BlockManifestSchema", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const result = BlockManifestSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("ai-chatbot");
          expect(result.data.type).toBe("integration");
        }
      });

      it("requires server mode", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.requiredMode).toBe("server");
      });

      it("declares required environment variables for Workers AI", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const envVarNames = parsed.envVars.map((v: Record<string, unknown>) => v.name);
        expect(envVarNames).toContain("CLOUDFLARE_ACCOUNT_ID");
        expect(envVarNames).toContain("CLOUDFLARE_AI_TOKEN");
      });

      it("has AI metadata with pairsWith", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.ai).toBeDefined();
        expect(parsed.ai.whenToUse).toBeTruthy();
        expect(parsed.ai.pairsWith.length).toBeGreaterThan(0);
      });
    });

    describe("source files", () => {
      it("ai-chat.ts exists", () => {
        expect(existsSync(join(blockDir, "ai-chat.ts"))).toBe(true);
      });

      it("chat-api.ts exists", () => {
        expect(existsSync(join(blockDir, "chat-api.ts"))).toBe(true);
      });

      it("AiChatbot.astro exists", () => {
        expect(existsSync(join(blockDir, "AiChatbot.astro"))).toBe(true);
      });
    });
  });

  describe("ai-search", () => {
    const blockDir = join(BLOCKS_DIR, "ai-search");

    describe("block.json", () => {
      it("parses against BlockManifestSchema", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const result = BlockManifestSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("ai-search");
          expect(result.data.type).toBe("integration");
        }
      });

      it("requires server mode", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.requiredMode).toBe("server");
      });

      it("declares required environment variables for Workers AI + Vectorize", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const envVarNames = parsed.envVars.map((v: Record<string, unknown>) => v.name);
        expect(envVarNames).toContain("CLOUDFLARE_ACCOUNT_ID");
        expect(envVarNames).toContain("CLOUDFLARE_AI_TOKEN");
        expect(envVarNames).toContain("VECTORIZE_INDEX_NAME");
      });

      it("has AI metadata that pairs with content blocks", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.ai).toBeDefined();
        expect(parsed.ai.pairsWith).toContain("docs-collection");
        expect(parsed.ai.pairsWith).toContain("blog-mdx");
      });
    });

    describe("source files", () => {
      it("ai-search.ts exists", () => {
        expect(existsSync(join(blockDir, "ai-search.ts"))).toBe(true);
      });

      it("search-api.ts exists", () => {
        expect(existsSync(join(blockDir, "search-api.ts"))).toBe(true);
      });

      it("AiSearch.astro exists", () => {
        expect(existsSync(join(blockDir, "AiSearch.astro"))).toBe(true);
      });
    });
  });

  describe("ai-og-images", () => {
    const blockDir = join(BLOCKS_DIR, "ai-og-images");

    describe("block.json", () => {
      it("parses against BlockManifestSchema", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const result = BlockManifestSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("ai-og-images");
          expect(result.data.type).toBe("integration");
        }
      });

      it("requires hybrid mode", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.requiredMode).toBe("hybrid");
      });

      it("declares required environment variables for Workers AI", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const envVarNames = parsed.envVars.map((v: Record<string, unknown>) => v.name);
        expect(envVarNames).toContain("CLOUDFLARE_ACCOUNT_ID");
        expect(envVarNames).toContain("CLOUDFLARE_AI_TOKEN");
      });

      it("has AI metadata that pairs with content blocks", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.ai).toBeDefined();
        expect(parsed.ai.pairsWith).toContain("blog-mdx");
        expect(parsed.ai.pairsWith).toContain("docs-collection");
      });
    });

    describe("source files", () => {
      it("og-generator.ts exists", () => {
        expect(existsSync(join(blockDir, "og-generator.ts"))).toBe(true);
      });

      it("og-api.ts exists", () => {
        expect(existsSync(join(blockDir, "og-api.ts"))).toBe(true);
      });
    });
  });
});
