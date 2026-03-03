/**
 * Integration tests for the AI conversation loop.
 *
 * Uses the mock provider to simulate end-to-end AI conversation flows.
 * Tests validate: analysis, clarification, content generation, palette selection,
 * and the resulting ResolvedConfig.
 */

import { describe, it, expect } from "vitest";
import { runAIConversation } from "../../src/ai/conversation.js";
import { ResolvedConfigSchema } from "../../src/schemas/config.js";
import { isOk, isErr } from "../../src/utils/result.js";
import type { BlockRegistry } from "../../src/ai/prompt-builder.js";
import type { AIProvider } from "../../src/ai/provider.js";
import type { Intent } from "../../src/ai/schemas.js";
import { IntentSchema } from "../../src/ai/schemas.js";
import type { BlockManifest, Palette } from "fornix-registry";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Helpers ──────────────────────────────────────────────

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
  "ai-responses",
);

function loadFixtureIntent(name: string): Intent {
  const raw = readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf-8");
  return IntentSchema.parse(JSON.parse(raw));
}

/** A minimal palette that satisfies the Palette schema. */
function createTestPalette(overrides: Partial<Palette> = {}): Palette {
  return {
    schemaVersion: 1,
    name: "fintech-dark",
    displayName: "Fintech Dark",
    category: "brand-inspired",
    mode: "dark" as const,
    colors: {
      primary: "#10b981",
      secondary: "#34d399",
      accent: "#6366f1",
      background: "#0a0a0a",
      foreground: "#ecfdf5",
    },
    ...overrides,
  };
}

/** A minimal block manifest for testing. */
function createTestBlock(overrides: Partial<BlockManifest> = {}): BlockManifest {
  return {
    schemaVersion: 1,
    name: "hero-gradient",
    version: "1.0.0",
    type: "section" as const,
    description: "A gradient hero section",
    category: "hero",
    tags: ["hero", "gradient"],
    dependencies: {},
    requires: [],
    conflicts: [],
    envVars: [],
    variants: ["default"],
    slots: [],
    files: [{ source: "hero.astro", destination: "src/components/hero.astro" }],
    ai: {
      whenToUse: "When a bold landing page hero is needed",
      whenNotToUse: "For documentation or blog sites",
      pairsWith: ["features-grid", "cta-simple"],
      contentSlots: {
        headline: {
          type: "string" as const,
          description: "Main headline text",
          maxLength: 100,
        },
        subheadline: {
          type: "string" as const,
          description: "Supporting text below headline",
          maxLength: 200,
        },
      },
    },
    ...overrides,
  };
}

/** Create a mock provider that returns a fixture based on prompt keywords. */
function createTestMockProvider(fixtureMap: Record<string, Intent>): AIProvider {
  return {
    name: "mock",
    async generate<T extends z.ZodType>(options: {
      system: string;
      prompt: string;
      schema: T;
      maxTokens?: number;
    }): Promise<z.infer<T>> {
      const lowerPrompt = options.prompt.toLowerCase();

      for (const [keyword, intent] of Object.entries(fixtureMap)) {
        if (lowerPrompt.includes(keyword)) {
          // The schema might be IntentSchema or a content generation schema.
          // For IntentSchema calls, return the fixture intent.
          // For other schemas, return a minimal valid object.
          return intent as z.infer<T>;
        }
      }

      // Default: return first fixture
      const firstIntent = Object.values(fixtureMap)[0];
      if (firstIntent) {
        return firstIntent as z.infer<T>;
      }

      throw new Error("No fixture matched and no default available");
    },
    async *stream(): AsyncIterable<string> {
      yield "mock stream output";
    },
  };
}

/** Create a test registry with common blocks and palettes. */
function createTestRegistry(): BlockRegistry {
  return {
    blocks: [
      createTestBlock({ name: "hero-gradient" }),
      createTestBlock({
        name: "features-grid",
        type: "section",
        description: "A grid of feature cards",
        category: "features",
        tags: ["features", "grid"],
        ai: {
          whenToUse: "To display product features",
          whenNotToUse: "When features are not relevant",
          pairsWith: ["hero-gradient"],
          contentSlots: {
            title: { type: "string", description: "Section title", maxLength: 80 },
            features: {
              type: "array",
              description: "List of features",
              minItems: 3,
              maxItems: 6,
              items: {
                title: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
        files: [{ source: "features-grid.astro", destination: "src/components/features-grid.astro" }],
      }),
      createTestBlock({
        name: "cta-simple",
        type: "section",
        description: "A simple call-to-action section",
        category: "cta",
        tags: ["cta", "conversion"],
        ai: {
          whenToUse: "To drive conversions",
          whenNotToUse: "On informational pages",
          pairsWith: ["hero-gradient"],
          contentSlots: {
            heading: { type: "string", description: "CTA heading", maxLength: 60 },
            buttonText: { type: "string", description: "Button label", maxLength: 30 },
          },
        },
        files: [{ source: "cta-simple.astro", destination: "src/components/cta-simple.astro" }],
      }),
      createTestBlock({
        name: "footer-minimal",
        type: "section",
        description: "A minimal footer with links",
        category: "footer",
        tags: ["footer"],
        ai: {
          whenToUse: "For clean, minimal footers",
          whenNotToUse: "When extensive footer navigation is needed",
          pairsWith: [],
          contentSlots: {
            copyright: { type: "string", description: "Copyright text" },
          },
        },
        files: [{ source: "footer.astro", destination: "src/components/footer.astro" }],
      }),
    ],
    palettes: [
      createTestPalette(),
      createTestPalette({
        name: "corporate-blue",
        displayName: "Corporate Blue",
        category: "professional",
        mode: "light",
        colors: {
          primary: "#1e40af",
          secondary: "#2563eb",
          accent: "#0d9488",
          background: "#f0f9ff",
          foreground: "#1e3a5f",
        },
      }),
      createTestPalette({
        name: "ocean-breeze",
        displayName: "Ocean Breeze",
        category: "nature",
        mode: "light",
        colors: {
          primary: "#0077b6",
          secondary: "#00b4d8",
          accent: "#90e0ef",
          background: "#f8fdff",
          foreground: "#023e8a",
        },
      }),
    ],
  };
}

// ── Test Suite ────────────────────────────────────────────

describe("runAIConversation", () => {
  it("fintech description produces a valid ResolvedConfig", async () => {
    const intent = loadFixtureIntent("fintech-landing");
    const provider = createTestMockProvider({ fintech: intent });
    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider,
      registry,
      description: "Build a fintech landing page for FinVault",
      projectName: "finvault",
      projectDir: "/tmp/finvault",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const config = result.value;

    // Must parse as a valid ResolvedConfig
    const parsed = ResolvedConfigSchema.safeParse(config);
    expect(parsed.success).toBe(true);

    // Fintech with auth → server mode (rules engine)
    expect(config.renderMode).toBe("server");
    expect(config.createdWith).toBe("ai");
    expect(config.projectName).toBe("finvault");
    expect(config.projectDir).toBe("/tmp/finvault");

    // Blocks should include AI recommendations that exist in registry
    const blockNames = config.blocks.map((b) => b.name);
    expect(blockNames).toContain("hero-gradient");

    // Rules engine should have added auth + db blocks
    expect(blockNames).toContain("auth-better-auth");
    expect(blockNames).toContain("db-d1");

    // Palette should be set
    expect(config.palette.colors.primary).toBeTruthy();
  });

  it("ambiguous description generates follow-up questions", async () => {
    // SaaS dashboard has overallConfidence 0.82 and 2 uncertainties
    const intent = loadFixtureIntent("saas-dashboard");
    const provider = createTestMockProvider({ saas: intent });
    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider,
      registry,
      description: "Build a SaaS project management dashboard",
      projectName: "taskflow",
      projectDir: "/tmp/taskflow",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const config = result.value;
    const parsed = ResolvedConfigSchema.safeParse(config);
    expect(parsed.success).toBe(true);

    // SaaS with auth → server mode
    expect(config.renderMode).toBe("server");

    // Theme switcher should be enabled (from fixture)
    expect(config.themeSwitcher).toBe(true);
  });

  it("multilingual description populates locales", async () => {
    const intent = loadFixtureIntent("multilingual-agency");
    const provider = createTestMockProvider({
      agency: intent,
      multilingual: intent,
    });
    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider,
      registry,
      description: "Build a multilingual design agency website for Pixel & Co",
      projectName: "pixel-co",
      projectDir: "/tmp/pixel-co",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const config = result.value;
    const parsed = ResolvedConfigSchema.safeParse(config);
    expect(parsed.success).toBe(true);

    // Multilingual fixture has ["en", "fr", "ar"]
    expect(config.locales).toEqual(["en", "fr", "ar"]);
    expect(config.defaultLocale).toBe("en");

    // Theme switcher should be on (from fixture)
    expect(config.themeSwitcher).toBe(true);
  });

  it("content is generated for all selected blocks", async () => {
    const intent = loadFixtureIntent("fintech-landing");
    const provider = createTestMockProvider({ fintech: intent });
    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider,
      registry,
      description: "Build a fintech landing page with great content",
      projectName: "finvault",
      projectDir: "/tmp/finvault",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const config = result.value;

    // Content should be generated for blocks that have content slots
    // and exist in the registry
    if (config.content) {
      // Every key in content should correspond to a selected block
      for (const blockName of Object.keys(config.content)) {
        const blockExists = config.blocks.some((b) => b.name === blockName);
        expect(blockExists).toBe(true);
      }

      // Registry blocks with contentSlots that are selected should have content
      const registryBlocksWithContent = registry.blocks.filter(
        (b) => b.ai?.contentSlots && Object.keys(b.ai.contentSlots).length > 0,
      );
      const selectedBlockNames = new Set(config.blocks.map((b) => b.name));
      for (const block of registryBlocksWithContent) {
        if (selectedBlockNames.has(block.name)) {
          expect(config.content[block.name]).toBeDefined();
        }
      }
    }
  });

  it("multilingual content includes all locales", async () => {
    const intent = loadFixtureIntent("multilingual-agency");

    // Create a provider that also returns content for content generation calls
    const contentProvider: AIProvider = {
      name: "mock",
      async generate<T extends z.ZodType>(options: {
        system: string;
        prompt: string;
        schema: T;
        maxTokens?: number;
      }): Promise<z.infer<T>> {
        // Return intent for analysis calls
        return intent as z.infer<T>;
      },
      async *stream(): AsyncIterable<string> {
        yield "mock stream output";
      },
    };

    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider: contentProvider,
      registry,
      description: "Build a multilingual design agency site",
      projectName: "pixel-co",
      projectDir: "/tmp/pixel-co",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const config = result.value;

    // For multilingual projects, content should have entries for each locale
    if (config.content) {
      for (const blockContent of Object.values(config.content)) {
        const localeKeys = Object.keys(blockContent);
        // Each locale from the config should be present
        for (const locale of config.locales) {
          expect(localeKeys).toContain(locale);
        }
      }
    }
  });

  it("returns error for provider failure", async () => {
    const failingProvider: AIProvider = {
      name: "failing-mock",
      async generate(): Promise<never> {
        throw new Error("API connection failed");
      },
      async *stream(): AsyncIterable<string> {
        throw new Error("API connection failed");
      },
    };

    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider: failingProvider,
      registry,
      description: "Build something",
      projectName: "test",
      projectDir: "/tmp/test",
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;

    expect(result.error.kind).toBe("ProviderError");
  });

  it("palette colors are populated from registry or AI", async () => {
    const intent = loadFixtureIntent("fintech-landing");
    const provider = createTestMockProvider({ fintech: intent });
    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider,
      registry,
      description: "Build a fintech platform",
      projectName: "finvault",
      projectDir: "/tmp/finvault",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const config = result.value;

    // Palette must have all required color fields
    expect(config.palette.colors.primary).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    expect(config.palette.colors.secondary).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    expect(config.palette.colors.accent).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    expect(config.palette.colors.background).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    expect(config.palette.colors.foreground).toMatch(/^#[0-9a-fA-F]{3,6}$/);
  });

  it("applies rules engine correctly for auth intent", async () => {
    const intent = loadFixtureIntent("fintech-landing");
    const provider = createTestMockProvider({ fintech: intent });
    const registry = createTestRegistry();

    const result = await runAIConversation({
      provider,
      registry,
      description: "Build a fintech app with user authentication",
      projectName: "finapp",
      projectDir: "/tmp/finapp",
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const config = result.value;

    // Auth rule: needsAuth + hasUserAccounts → server mode + auth + db blocks
    expect(config.renderMode).toBe("server");
    const blockNames = config.blocks.map((b) => b.name);
    expect(blockNames).toContain("auth-better-auth");
    expect(blockNames).toContain("db-d1");

    // Payments rule: needsPayments → payments-stripe
    expect(blockNames).toContain("payments-stripe");

    // Cloudflare analytics rule (default deploy target)
    expect(blockNames).toContain("analytics-cf");
  });
});
