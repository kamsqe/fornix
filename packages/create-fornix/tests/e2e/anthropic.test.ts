/**
 * Real Anthropic provider e2e.
 *
 * Skipped automatically when `ANTHROPIC_API_KEY` is not in the environment —
 * CI without a key reports as "skipped" rather than failing. The mock-provider
 * test in `ai-copy.test.ts` is the deterministic integration gate; this test
 * exists to prove the real provider's wire still works without re-running
 * every commit (costs money, takes seconds).
 *
 * Run locally with:
 *   ANTHROPIC_API_KEY=sk-ant-... pnpm vitest run tests/e2e/anthropic.test.ts
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  scaffoldProject,
  type ResolvedConfig,
  type BrandContext,
} from "../../src/index.js";
import { createAnthropicProvider } from "../../src/ai/providers/anthropic.js";

const HAS_KEY = !!process.env.ANTHROPIC_API_KEY;

function makeBaseConfig(projectDir: string): ResolvedConfig {
  return {
    projectName: "anthropic-test",
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: [
      { name: "hero-text", variant: "default" },
      { name: "cta-strip", variant: "default" },
    ],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      preset: "obsidian",
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    },
    themeSwitcher: false,
    createdWith: "ai",
  };
}

const brand: BrandContext = {
  name: "Lexura",
  description: "AI-powered commercial dispute resolution platform",
  tone: "clear, specific, trustworthy",
  industry: "legal-tech",
  audience: "small business owners and in-house counsel",
};

describe.skipIf(!HAS_KEY)("Anthropic provider (live)", () => {
  it("generates valid copy for every requested block", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-anthropic-"));
    const projectDir = join(tmp, "site");
    try {
      const provider = createAnthropicProvider({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        model: process.env.FORNIX_ANTHROPIC_MODEL ?? "claude-haiku-4-5",
      });

      const result = await scaffoldProject(makeBaseConfig(projectDir), {
        provider,
        brand,
      });

      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);
      if (!result.ok) return;

      const trace = result.value.copyTrace;
      const aiCount = trace.filter((e) => e.source === "ai").length;
      const failedValidation = trace.filter(
        (e) => e.source === "ai-validation-failed",
      ).length;

      // We requested 2 blocks × 1 locale = 2 entries.
      expect(trace.length).toBe(2);
      // Most should land as AI; allow at most one validation slip on a flaky run.
      expect(aiCount).toBeGreaterThanOrEqual(1);
      expect(failedValidation).toBeLessThanOrEqual(1);

      // Light content sanity — every AI entry has a non-empty headline.
      for (const entry of trace) {
        if (entry.source === "ai") {
          const headline = entry.content.headline;
          expect(typeof headline).toBe("string");
          expect((headline as string).length).toBeGreaterThan(3);
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 90_000);
});
