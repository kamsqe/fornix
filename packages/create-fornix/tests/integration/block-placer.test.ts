import { describe, it, expect } from "vitest";
import { placeBlocks } from "../../src/scaffold/block-placer";
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

// ── Block Source Content ─────────────────────────────────

const BLOCK_SOURCES: Record<string, Record<string, string>> = {
  "hero-gradient": {
    "hero-gradient.astro": "<section>Hero Gradient</section>\n",
  },
  "footer-minimal": {
    "footer-minimal.astro": "<footer>Footer Minimal</footer>\n",
  },
  "auth-middleware": {
    "middleware.ts": "export function onRequest() {}\n",
    "auth-api.ts": "export function POST() {}\n",
  },
  "api-contact": {
    "contact.ts": "export function POST() {}\n",
    "contact-server.ts": "export function serverHandler() {}\n",
  },
};

// ── Tests ─────────────────────────────────────────────────

describe("placeBlocks", () => {
  // ── Section Block ──

  it("places section block files in src/components/sections/", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      files: [
        {
          source: "hero-gradient.astro",
          destination: "src/components/sections/hero-gradient.astro",
        },
      ],
    });

    const result = placeBlocks(
      [heroManifest],
      BLOCK_SOURCES,
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(
        result.value["src/components/sections/hero-gradient.astro"],
      ).toBe("<section>Hero Gradient</section>\n");
    }
  });

  // ── Integration Block ──

  it("places integration block files in src/lib/ and src/pages/api/", () => {
    const authManifest = manifest("auth-middleware", {
      type: "integration",
      files: [
        {
          source: "middleware.ts",
          destination: "src/middleware/auth.ts",
        },
        {
          source: "auth-api.ts",
          destination: "src/pages/api/auth.ts",
        },
      ],
    });

    const result = placeBlocks(
      [authManifest],
      BLOCK_SOURCES,
      baseConfig({ renderMode: "server" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value["src/middleware/auth.ts"]).toBe(
        "export function onRequest() {}\n",
      );
      expect(result.value["src/pages/api/auth.ts"]).toBe(
        "export function POST() {}\n",
      );
    }
  });

  // ── Condition: file skipped when renderMode === 'static' ──

  it("skips files with condition when renderMode is static", () => {
    const apiManifest = manifest("api-contact", {
      type: "integration",
      files: [
        {
          source: "contact.ts",
          destination: "src/pages/api/contact.ts",
          condition: "renderMode !== 'static'",
        },
        {
          source: "contact-server.ts",
          destination: "src/lib/contact-server.ts",
          condition: "renderMode !== 'static'",
        },
      ],
    });

    const result = placeBlocks(
      [apiManifest],
      BLOCK_SOURCES,
      baseConfig({ renderMode: "static" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value["src/pages/api/contact.ts"]).toBeUndefined();
      expect(result.value["src/lib/contact-server.ts"]).toBeUndefined();
    }
  });

  // ── Condition: file included when renderMode === 'server' ──

  it("includes conditional files when renderMode is server", () => {
    const apiManifest = manifest("api-contact", {
      type: "integration",
      files: [
        {
          source: "contact.ts",
          destination: "src/pages/api/contact.ts",
          condition: "renderMode !== 'static'",
        },
        {
          source: "contact-server.ts",
          destination: "src/lib/contact-server.ts",
          condition: "renderMode !== 'static'",
        },
      ],
    });

    const result = placeBlocks(
      [apiManifest],
      BLOCK_SOURCES,
      baseConfig({ renderMode: "server" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value["src/pages/api/contact.ts"]).toBe(
        "export function POST() {}\n",
      );
      expect(result.value["src/lib/contact-server.ts"]).toBe(
        "export function serverHandler() {}\n",
      );
    }
  });

  // ── No files from unselected blocks leak in ──

  it("does not include files from unselected blocks", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      files: [
        {
          source: "hero-gradient.astro",
          destination: "src/components/sections/hero-gradient.astro",
        },
      ],
    });

    const result = placeBlocks(
      [heroManifest],
      BLOCK_SOURCES,
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const filePaths = Object.keys(result.value);
      expect(filePaths).toEqual([
        "src/components/sections/hero-gradient.astro",
      ]);
      // No footer-minimal files should be present
      expect(
        filePaths.some((path) => path.includes("footer")),
      ).toBe(false);
      // No auth-middleware files should be present
      expect(
        filePaths.some((path) => path.includes("auth")),
      ).toBe(false);
    }
  });

  // ── Multiple blocks placed correctly ──

  it("places files from multiple blocks without mixing", () => {
    const heroManifest = manifest("hero-gradient", {
      type: "section",
      files: [
        {
          source: "hero-gradient.astro",
          destination: "src/components/sections/hero-gradient.astro",
        },
      ],
    });

    const footerManifest = manifest("footer-minimal", {
      type: "section",
      files: [
        {
          source: "footer-minimal.astro",
          destination: "src/components/sections/footer-minimal.astro",
        },
      ],
    });

    const result = placeBlocks(
      [heroManifest, footerManifest],
      BLOCK_SOURCES,
      baseConfig(),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(
        result.value["src/components/sections/hero-gradient.astro"],
      ).toBe("<section>Hero Gradient</section>\n");
      expect(
        result.value["src/components/sections/footer-minimal.astro"],
      ).toBe("<footer>Footer Minimal</footer>\n");
    }
  });

  // ── Empty blocks array ──

  it("returns empty file map when no blocks are provided", () => {
    const result = placeBlocks([], BLOCK_SOURCES, baseConfig());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(Object.keys(result.value)).toHaveLength(0);
    }
  });

  // ── Missing block source returns error ──

  it("returns error when block source content is missing", () => {
    const unknownManifest = manifest("nonexistent-block", {
      files: [
        {
          source: "missing.astro",
          destination: "src/components/sections/missing.astro",
        },
      ],
    });

    const result = placeBlocks(
      [unknownManifest],
      BLOCK_SOURCES,
      baseConfig(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("nonexistent-block");
    }
  });
});
