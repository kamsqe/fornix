import { describe, it, expect } from "vitest";
import { buildSystemPrompt, type BlockRegistry } from "../../src/ai/prompt-builder.js";
import {
  FIXTURE_MANIFESTS,
  loadAllPalettes,
} from "../../src/cli/fixture-registry.js";
import type { BlockManifest, Palette } from "fornix-registry";

// ── Build fixture registry ──────────────────────────────

const fixtureBlocks: ReadonlyArray<BlockManifest> =
  Object.values(FIXTURE_MANIFESTS);

const fixturePalettes: ReadonlyArray<Palette> = loadAllPalettes();

const fixtureRegistry: BlockRegistry = {
  blocks: fixtureBlocks,
  palettes: fixturePalettes,
};

// ── Tests ────────────────────────────────────────────────

describe("prompt-builder", () => {
  it("prompt contains all block names from fixture registry", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    for (const block of fixtureBlocks) {
      expect(prompt).toContain(block.name);
    }
  });

  it("prompt contains block descriptions", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    for (const block of fixtureBlocks) {
      expect(prompt).toContain(block.description);
    }
  });

  it("prompt contains block categories and tags", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    for (const block of fixtureBlocks) {
      expect(prompt).toContain(block.category);
    }
  });

  it("prompt contains AI metadata (whenToUse, whenNotToUse)", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    // hero-gradient has AI metadata in fixture
    const heroBlock = FIXTURE_MANIFESTS["hero-gradient"];
    if (heroBlock?.ai) {
      expect(prompt).toContain(heroBlock.ai.whenToUse);
      expect(prompt).toContain(heroBlock.ai.whenNotToUse);
    }
  });

  it("prompt contains pairsWith references", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    const heroBlock = FIXTURE_MANIFESTS["hero-gradient"];
    if (heroBlock?.ai?.pairsWith) {
      for (const pair of heroBlock.ai.pairsWith) {
        expect(prompt).toContain(pair);
      }
    }
  });

  it("prompt contains palette names", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    if (fixturePalettes.length > 0) {
      for (const palette of fixturePalettes.slice(0, 5)) {
        expect(prompt).toContain(palette.name);
        expect(prompt).toContain(palette.displayName);
      }
    }
  });

  it("prompt contains palette categories", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    if (fixturePalettes.length > 0) {
      const categories = new Set(fixturePalettes.map((p) => p.category));
      for (const cat of categories) {
        expect(prompt).toContain(cat);
      }
    }
  });

  it("prompt contains constraint rules", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    // Render modes
    expect(prompt).toContain("static");
    expect(prompt).toContain("hybrid");
    expect(prompt).toContain("server");

    // Deterministic rules
    expect(prompt).toContain("auth-better-auth");
    expect(prompt).toContain("db-d1");
    expect(prompt).toContain("payments-stripe");
    expect(prompt).toContain("analytics-cf");
    expect(prompt).toContain("blog-mdx");
    expect(prompt).toContain("theme-switcher");
  });

  it("prompt contains server-required block constraints", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    // auth-better-auth and db-d1 require server mode
    expect(prompt).toContain("Server-Required");
    expect(prompt).toContain("auth-better-auth");
    expect(prompt).toContain("db-d1");
  });

  it("prompt contains dependency chain info", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    // auth-better-auth requires db-d1
    expect(prompt).toContain("Dependencies");
    expect(prompt).toContain("requires");
  });

  it("prompt contains output instructions with IntentSchema fields", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    expect(prompt).toContain("siteType");
    expect(prompt).toContain("recommendedBlocks");
    expect(prompt).toContain("overallConfidence");
    expect(prompt).toContain("IntentSchema");
  });

  it("prompt is a non-empty string", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);

    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(500);
  });

  it("snapshot test: prompt matches snapshot", () => {
    const prompt = buildSystemPrompt(fixtureRegistry);
    expect(prompt).toMatchSnapshot();
  });
});
