import { describe, it, expect } from "vitest";
import { wireContent } from "../../src/scaffold/content-wiring";
import { isOk } from "../../src/utils/result";
import type { BlockManifest } from "fornix-registry";
import type { ResolvedConfig } from "../../src/schemas/config";

// ── Fixtures ─────────────────────────────────────────────

function manifest(
  name: string,
  overrides: Partial<BlockManifest> = {},
): BlockManifest {
  return {
    schemaVersion: 1,
    name,
    version: "1.0.0",
    type: "section",
    description: `Block ${name}`,
    category: "test",
    tags: [],
    dependencies: {},
    requires: [],
    conflicts: [],
    envVars: [],
    variants: ["default"],
    slots: [],
    files: [
      {
        source: `${name}.astro`,
        destination: `src/components/sections/${name}.astro`,
      },
    ],
    ...overrides,
  };
}

function baseConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectName: "test-project",
    projectDir: "./test-project",
    renderMode: "static",
    deployTarget: "cloudflare",
    database: "none",
    cssEngine: "tailwind",
    packageManager: "pnpm",
    blocks: [],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
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
    ...overrides,
  } as ResolvedConfig;
}

// ── Block Content (default content for each block) ───────

const BLOCK_DEFAULT_CONTENT: Record<string, Record<string, unknown>> = {
  "hero-gradient": {
    headline: "Welcome to our site",
    subheadline: "Build something amazing",
    ctaText: "Get Started",
    ctaLink: "/signup",
  },
  "features-grid": {
    title: "Features",
    items: [
      { title: "Fast", description: "Lightning fast performance" },
      { title: "Secure", description: "Built-in security" },
      { title: "Scalable", description: "Grows with you" },
    ],
  },
};

// ── Tests ─────────────────────────────────────────────────

describe("wireContent", () => {
  // ── 1 block with content → config.ts has its collection ──

  it("generates src/content/config.ts with collection for 1 block", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      ai: {
        whenToUse: "Landing page hero",
        whenNotToUse: "Internal pages",
        pairsWith: ["features-grid"],
        contentSlots: {
          headline: { type: "string", description: "Main headline" },
          subheadline: { type: "string", description: "Sub headline" },
          ctaText: { type: "string", description: "Button text" },
          ctaLink: { type: "string", description: "Button link" },
        },
      },
    });

    const result = wireContent(
      [heroManifest],
      BLOCK_DEFAULT_CONTENT,
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const configTs = result.value["src/content/config.ts"];
      expect(configTs).toBeDefined();
      expect(configTs).toContain("sections");
      expect(configTs).toContain("defineCollection");
    }
  });

  // ── 2 blocks of same type → single shared collection ──

  it("merges collections from 2 blocks into config.ts", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      ai: {
        whenToUse: "Landing page hero",
        whenNotToUse: "Internal pages",
        pairsWith: [],
        contentSlots: {
          headline: { type: "string" },
          subheadline: { type: "string" },
        },
      },
    });

    const featuresManifest = manifest("features-grid", {
      type: "section",
      ai: {
        whenToUse: "Show features",
        whenNotToUse: "Simple pages",
        pairsWith: [],
        contentSlots: {
          title: { type: "string" },
          items: { type: "array" },
        },
      },
    });

    const result = wireContent(
      [heroManifest, featuresManifest],
      BLOCK_DEFAULT_CONTENT,
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const configTs = result.value["src/content/config.ts"];
      expect(configTs).toBeDefined();
      // Both section blocks share the "sections" collection
      expect(configTs).toContain("sections");
      expect(configTs).toContain("defineCollection");
    }
  });

  // ── Single locale → content in src/content/sections/ ──

  it("places content in src/content/sections/ for single locale", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      ai: {
        whenToUse: "Hero",
        whenNotToUse: "None",
        pairsWith: [],
        contentSlots: {
          headline: { type: "string" },
        },
      },
    });

    const result = wireContent(
      [heroManifest],
      BLOCK_DEFAULT_CONTENT,
      baseConfig({ locales: ["en"], defaultLocale: "en" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const contentFile = result.value["src/content/sections/hero-gradient.json"];
      expect(contentFile).toBeDefined();
      // Should NOT have locale-prefixed paths
      expect(
        result.value["src/content/en/sections/hero-gradient.json"],
      ).toBeUndefined();
    }
  });

  // ── 2 locales → content in src/content/{locale}/sections/ ──

  it("places content in locale-prefixed paths for 2 locales", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      ai: {
        whenToUse: "Hero",
        whenNotToUse: "None",
        pairsWith: [],
        contentSlots: {
          headline: { type: "string" },
        },
      },
    });

    const result = wireContent(
      [heroManifest],
      BLOCK_DEFAULT_CONTENT,
      baseConfig({ locales: ["en", "es"], defaultLocale: "en" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(
        result.value["src/content/en/sections/hero-gradient.json"],
      ).toBeDefined();
      expect(
        result.value["src/content/es/sections/hero-gradient.json"],
      ).toBeDefined();
      // Should NOT have non-locale paths
      expect(
        result.value["src/content/sections/hero-gradient.json"],
      ).toBeUndefined();
    }
  });

  // ── Default content files are valid JSON ──

  it("produces valid JSON for default content files", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      ai: {
        whenToUse: "Hero",
        whenNotToUse: "None",
        pairsWith: [],
        contentSlots: {
          headline: { type: "string" },
          subheadline: { type: "string" },
          ctaText: { type: "string" },
          ctaLink: { type: "string" },
        },
      },
    });

    const result = wireContent(
      [heroManifest],
      BLOCK_DEFAULT_CONTENT,
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const contentFile = result.value["src/content/sections/hero-gradient.json"];
      expect(contentFile).toBeDefined();
      const parsed = JSON.parse(contentFile as string);
      expect(parsed).toHaveProperty("headline");
      expect(parsed).toHaveProperty("subheadline");
    }
  });

  it("produces valid JSON for multi-locale content files", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      ai: {
        whenToUse: "Hero",
        whenNotToUse: "None",
        pairsWith: [],
        contentSlots: {
          headline: { type: "string" },
        },
      },
    });

    const result = wireContent(
      [heroManifest],
      BLOCK_DEFAULT_CONTENT,
      baseConfig({ locales: ["en", "es"], defaultLocale: "en" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const enFile = result.value["src/content/en/sections/hero-gradient.json"];
      const esFile = result.value["src/content/es/sections/hero-gradient.json"];
      expect(enFile).toBeDefined();
      expect(esFile).toBeDefined();
      expect(() => JSON.parse(enFile as string)).not.toThrow();
      expect(() => JSON.parse(esFile as string)).not.toThrow();
    }
  });

  // ── Blocks without contentSlots are skipped ──

  it("skips blocks without contentSlots", () => {
    const plainManifest = manifest("plain-section", {
      type: "section",
    });

    const result = wireContent(
      [plainManifest],
      {},
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // No content config needed for blocks without contentSlots
      expect(result.value["src/content/config.ts"]).toBeUndefined();
      expect(Object.keys(result.value)).toHaveLength(0);
    }
  });

  // ── Feature block content goes to correct subdirectory ──

  it("uses block type as content subdirectory", () => {
    const blogManifest = manifest("blog-list", {
      type: "feature",
      ai: {
        whenToUse: "Blog listing",
        whenNotToUse: "Non-blog sites",
        pairsWith: [],
        contentSlots: {
          title: { type: "string" },
        },
      },
    });

    const blogContent: Record<string, Record<string, unknown>> = {
      "blog-list": { title: "Blog" },
    };

    const result = wireContent(
      [blogManifest],
      blogContent,
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // Feature blocks place content under their type directory
      expect(
        result.value["src/content/features/blog-list.json"],
      ).toBeDefined();
    }
  });
});
