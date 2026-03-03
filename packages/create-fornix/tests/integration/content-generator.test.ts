import { describe, it, expect } from "vitest";
import {
  generateMultiLocaleContent,
  type ContentGenerationOptions,
} from "../../src/ai/content-generator.js";
import { createMockProvider } from "../../src/ai/providers/mock-provider.js";
import { FIXTURE_MANIFESTS } from "../../src/cli/fixture-registry.js";

// ── Helpers ──────────────────────────────────────────────

function blocksWithContentSlots() {
  return Object.values(FIXTURE_MANIFESTS).filter(
    (b) =>
      b.ai?.contentSlots !== undefined &&
      Object.keys(b.ai.contentSlots).length > 0,
  );
}

function baseOptions(
  overrides: Partial<ContentGenerationOptions> = {},
): ContentGenerationOptions {
  return {
    blocks: blocksWithContentSlots(),
    locales: ["en", "es"],
    defaultLocale: "en",
    brand: {
      name: "TestCo",
      description: "A test company",
      tone: "professional",
    },
    industry: "technology",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────

describe("multi-locale content generation", () => {
  const provider = createMockProvider();

  it("2 locales → content files exist for both", async () => {
    const options = baseOptions({ locales: ["en", "es"] });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = Object.keys(result.value);

    // Should have content files for both locales
    const enPaths = paths.filter((p) => p.startsWith("src/content/en/"));
    const esPaths = paths.filter((p) => p.startsWith("src/content/es/"));

    expect(enPaths.length).toBeGreaterThan(0);
    expect(esPaths.length).toBeGreaterThan(0);
    expect(enPaths.length).toBe(esPaths.length);
  });

  it("content files parse as valid JSON", async () => {
    const options = baseOptions({ locales: ["en", "es"] });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [path, content] of Object.entries(result.value)) {
      expect(() => JSON.parse(content)).not.toThrow();
      const parsed = JSON.parse(content) as Record<string, unknown>;
      expect(typeof parsed).toBe("object");
      expect(parsed).not.toBeNull();

      // Verify content matches block content slot schema
      // Each file should have keys matching the content slots
      expect(Object.keys(parsed).length).toBeGreaterThan(0);

      // Verify path ends in .json
      expect(path.endsWith(".json")).toBe(true);
    }
  });

  it("locale-specific content is different (not just duplicated)", async () => {
    const options = baseOptions({ locales: ["en", "es"] });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = Object.keys(result.value);

    // Find matching en/es file pairs
    const enPaths = paths.filter((p) => p.startsWith("src/content/en/"));

    for (const enPath of enPaths) {
      const esPath = enPath.replace("src/content/en/", "src/content/es/");

      if (result.value[esPath]) {
        const enContent = JSON.parse(result.value[enPath]!) as Record<string, unknown>;
        const esContent = JSON.parse(result.value[esPath]!) as Record<string, unknown>;

        // Content should NOT be identical
        const enJson = JSON.stringify(enContent);
        const esJson = JSON.stringify(esContent);
        expect(esJson).not.toBe(enJson);
      }
    }
  });

  it("single locale uses non-prefixed paths", async () => {
    const options = baseOptions({ locales: ["en"] });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = Object.keys(result.value);

    // No locale prefix for single locale
    for (const path of paths) {
      expect(path).not.toContain("src/content/en/");
      expect(path).toMatch(/^src\/content\/\w+\/[\w-]+\.json$/);
    }
  });

  it("3 locales → all three get content files", async () => {
    const options = baseOptions({ locales: ["en", "fr", "ar"] });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = Object.keys(result.value);
    const enPaths = paths.filter((p) => p.includes("/en/"));
    const frPaths = paths.filter((p) => p.includes("/fr/"));
    const arPaths = paths.filter((p) => p.includes("/ar/"));

    expect(enPaths.length).toBeGreaterThan(0);
    expect(frPaths.length).toBeGreaterThan(0);
    expect(arPaths.length).toBeGreaterThan(0);
    expect(enPaths.length).toBe(frPaths.length);
    expect(frPaths.length).toBe(arPaths.length);
  });

  it("blocks without content slots are skipped", async () => {
    // db-d1 has no content slots
    const dbBlock = FIXTURE_MANIFESTS["db-d1"];
    expect(dbBlock).toBeDefined();

    const options = baseOptions({
      blocks: [dbBlock!],
      locales: ["en", "es"],
    });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.value).length).toBe(0);
  });

  it("content slots have matching keys in generated content", async () => {
    const heroBlock = FIXTURE_MANIFESTS["hero-gradient"];
    expect(heroBlock).toBeDefined();
    expect(heroBlock!.ai?.contentSlots).toBeDefined();

    const options = baseOptions({
      blocks: [heroBlock!],
      locales: ["en"],
    });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = Object.keys(result.value);
    expect(paths.length).toBe(1);

    const content = JSON.parse(result.value[paths[0]!]!) as Record<string, unknown>;
    const slotNames = Object.keys(heroBlock!.ai!.contentSlots!);

    for (const slotName of slotNames) {
      expect(content).toHaveProperty(slotName);
    }
  });

  it("brand name is incorporated into generated content", async () => {
    const heroBlock = FIXTURE_MANIFESTS["hero-gradient"];
    expect(heroBlock).toBeDefined();

    const options = baseOptions({
      blocks: [heroBlock!],
      locales: ["en"],
      brand: {
        name: "SuperApp",
        description: "A super app",
        tone: "casual",
      },
    });
    const result = await generateMultiLocaleContent(provider, options);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paths = Object.keys(result.value);
    const content = JSON.parse(result.value[paths[0]!]!) as Record<string, unknown>;

    // Brand name should appear in the headline
    expect(content["headline"]).toContain("SuperApp");
  });
});
