import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

describe("integration blocks phase 42", () => {
  describe("payments-stripe", () => {
    const blockDir = join(BLOCKS_DIR, "payments-stripe");

    describe("block.json", () => {
      it("parses against BlockManifestSchema", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const result = BlockManifestSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("payments-stripe");
          expect(result.data.type).toBe("integration");
        }
      });

      it("requires hybrid or server mode", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(["hybrid", "server"]).toContain(parsed.requiredMode);
      });

      it("declares stripe dependency", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.dependencies["stripe"]).toBeDefined();
      });

      it("declares required environment variables", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const envVarNames = parsed.envVars.map((v: any) => v.name);
        expect(envVarNames).toContain("STRIPE_SECRET_KEY");
        expect(envVarNames).toContain("STRIPE_WEBHOOK_SECRET");
        expect(envVarNames).toContain("PUBLIC_STRIPE_KEY");
      });
    });

    describe("source files", () => {
      it("stripe.ts exists", () => {
        expect(existsSync(join(blockDir, "stripe.ts"))).toBe(true);
      });
    });
  });

  describe("email-resend", () => {
    const blockDir = join(BLOCKS_DIR, "email-resend");

    describe("block.json", () => {
      it("parses against BlockManifestSchema", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const result = BlockManifestSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("email-resend");
          expect(result.data.type).toBe("integration");
        }
      });

      it("requires hybrid or server mode", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(["hybrid", "server"]).toContain(parsed.requiredMode);
      });

      it("declares resend dependency", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.dependencies["resend"]).toBeDefined();
      });

      it("declares required environment variables", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const envVarNames = parsed.envVars.map((v: any) => v.name);
        expect(envVarNames).toContain("RESEND_API_KEY");
      });
    });

    describe("source files", () => {
      it("resend.ts exists", () => {
        expect(existsSync(join(blockDir, "resend.ts"))).toBe(true);
      });
    });
  });

  describe("analytics-cf", () => {
    const blockDir = join(BLOCKS_DIR, "analytics-cf");

    describe("block.json", () => {
      it("parses against BlockManifestSchema", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const result = BlockManifestSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("analytics-cf");
          expect(result.data.type).toBe("integration");
        }
      });

      it("declares required environment variables", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const envVarNames = parsed.envVars.map((v: any) => v.name);
        expect(envVarNames).toContain("CF_ANALYTICS_TOKEN");
      });
    });

    describe("source files", () => {
      it("CfAnalytics.astro exists", () => {
        expect(existsSync(join(blockDir, "CfAnalytics.astro"))).toBe(true);
      });
    });
  });
});
