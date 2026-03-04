import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { FetcherConfig } from "../../src/registry/block-fetcher.js";

// ── Mock giget at module level ───────────────────────────

const mockDownloadTemplate = vi.fn();
vi.mock("giget", () => ({
  downloadTemplate: (...args: unknown[]) => mockDownloadTemplate(...args),
}));

// Import AFTER mocking
const { fetchBlock, fetchBlocks, resetCacheVersionCheck } = await import(
  "../../src/registry/block-fetcher.js"
);

// ── Test Fixtures ────────────────────────────────────────

const TEST_CACHE_DIR = join(tmpdir(), "fornix-test-cache-" + Date.now());

const MOCK_MANIFEST = JSON.stringify({
  schemaVersion: 1,
  name: "hero-gradient",
  version: "1.0.0",
  type: "section",
  description: "Test block",
  category: "hero",
  tags: ["test"],
  dependencies: {},
  requires: [],
  conflicts: [],
  envVars: [],
  variants: ["default"],
  slots: [],
  files: [
    {
      source: "hero-gradient.astro",
      destination: "src/components/sections/hero-gradient.astro",
    },
  ],
  ai: {
    whenToUse: "test",
    whenNotToUse: "test",
    pairsWith: [],
    contentSlots: {},
  },
});

const MOCK_ASTRO = `---\nconst { headline } = Astro.props;\n---\n<h1>{headline}</h1>\n`;

const BASE_CONFIG: Partial<FetcherConfig> = {
  cacheDir: TEST_CACHE_DIR,
  force: false,
  maxCacheAge: 24 * 60 * 60 * 1000,
};

function seedCache(blockName: string): void {
  const blockDir = join(TEST_CACHE_DIR, blockName);
  mkdirSync(blockDir, { recursive: true });
  writeFileSync(join(blockDir, "block.json"), MOCK_MANIFEST);
  writeFileSync(join(blockDir, "hero-gradient.astro"), MOCK_ASTRO);
  // Write version marker so ensureCacheVersion doesn't clear seeded cache
  writeFileSync(join(TEST_CACHE_DIR, ".version"), "0.0.9");
}

function seedStaleCache(blockName: string): void {
  seedCache(blockName);
  const staleTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
  utimesSync(
    join(TEST_CACHE_DIR, blockName, "block.json"),
    staleTime,
    staleTime,
  );
}

// ── Setup / Teardown ─────────────────────────────────────

beforeEach(() => {
  mkdirSync(TEST_CACHE_DIR, { recursive: true });
  mockDownloadTemplate.mockReset();
  resetCacheVersionCheck();
});

afterEach(() => {
  if (existsSync(TEST_CACHE_DIR)) {
    rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
  }
});

// ── Tests ────────────────────────────────────────────────

describe("block-fetcher", () => {
  describe("cache hit", () => {
    it("returns block from cache when cache is valid", async () => {
      seedCache("hero-gradient");

      const result = await fetchBlock("hero-gradient", BASE_CONFIG);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.manifest.name).toBe("hero-gradient");
        expect(result.value.manifest.type).toBe("section");
        expect(result.value.fromCache).toBe(true);
        expect(result.value.files["hero-gradient.astro"]).toContain("headline");
      }
    });

    it("skips network call when cache is fresh", async () => {
      seedCache("hero-gradient");

      await fetchBlock("hero-gradient", BASE_CONFIG);

      expect(mockDownloadTemplate).not.toHaveBeenCalled();
    });

    it("validates manifest from cache against schema", async () => {
      // Write version marker so ensureCacheVersion doesn't clear cache
      writeFileSync(join(TEST_CACHE_DIR, ".version"), "0.0.9");
      const blockDir = join(TEST_CACHE_DIR, "bad-block");
      mkdirSync(blockDir, { recursive: true });
      writeFileSync(
        join(blockDir, "block.json"),
        JSON.stringify({ name: "bad-block" }),
      );

      const result = await fetchBlock("bad-block", BASE_CONFIG);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("FetchError");
        expect(result.error.message).toContain("Invalid manifest");
      }
    });
  });

  describe("network fetch (mocked)", () => {
    it("downloads block when cache is stale", async () => {
      seedStaleCache("hero-gradient");

      mockDownloadTemplate.mockImplementation(
        async (_source: string, options?: { dir?: string }) => {
          const dir = options?.dir ?? "";
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, "block.json"), MOCK_MANIFEST);
          writeFileSync(join(dir, "hero-gradient.astro"), MOCK_ASTRO);
          return { source: _source, dir };
        },
      );

      const result = await fetchBlock("hero-gradient", BASE_CONFIG);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.manifest.name).toBe("hero-gradient");
        expect(result.value.files["hero-gradient.astro"]).toBeDefined();
      }
      expect(mockDownloadTemplate).toHaveBeenCalled();
    });

    it("returns manifest and files on successful fetch", async () => {
      mockDownloadTemplate.mockImplementation(
        async (_source: string, options?: { dir?: string }) => {
          const dir = options?.dir ?? "";
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, "block.json"), MOCK_MANIFEST);
          writeFileSync(join(dir, "hero-gradient.astro"), MOCK_ASTRO);
          writeFileSync(join(dir, "hero-gradient.css"), ".hero { color: red; }");
          return { source: _source, dir };
        },
      );

      const result = await fetchBlock("hero-gradient", {
        ...BASE_CONFIG,
        force: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.manifest.name).toBe("hero-gradient");
        expect(result.value.files["hero-gradient.astro"]).toContain("headline");
        expect(result.value.files["hero-gradient.css"]).toContain(".hero");
      }
    });
  });

  describe("offline + cache miss", () => {
    it("returns FetchError without crashing", async () => {
      mockDownloadTemplate.mockRejectedValue(
        new Error(
          "Network request failed: getaddrinfo ENOTFOUND github.com",
        ),
      );

      const result = await fetchBlock("nonexistent-block", BASE_CONFIG);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("FetchError");
        expect(result.error.blockName).toBe("nonexistent-block");
        expect(result.error.message).toContain("Failed to fetch");
        expect(result.error.message).toContain("nonexistent-block");
      }
    });

    it("falls back to stale cache when download fails", async () => {
      seedStaleCache("hero-gradient");

      mockDownloadTemplate.mockRejectedValue(new Error("Network error"));

      const result = await fetchBlock("hero-gradient", BASE_CONFIG);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.manifest.name).toBe("hero-gradient");
        expect(result.value.fromCache).toBe(true);
      }
    });
  });

  describe("fetchBlocks (multiple)", () => {
    it("fetches multiple blocks concurrently", async () => {
      seedCache("hero-gradient");

      const footerDir = join(TEST_CACHE_DIR, "footer-minimal");
      mkdirSync(footerDir, { recursive: true });
      writeFileSync(
        join(footerDir, "block.json"),
        JSON.stringify({
          ...JSON.parse(MOCK_MANIFEST),
          name: "footer-minimal",
          category: "footer",
        }),
      );

      const results = await fetchBlocks(
        ["hero-gradient", "footer-minimal"],
        BASE_CONFIG,
      );

      expect(results.length).toBe(2);
      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
    });

    it("returns individual errors for failed blocks", async () => {
      seedCache("hero-gradient");

      mockDownloadTemplate.mockRejectedValue(new Error("Network error"));

      const results = await fetchBlocks(
        ["hero-gradient", "missing-block"],
        BASE_CONFIG,
      );

      expect(results.length).toBe(2);
      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(false);
    });
  });
});
