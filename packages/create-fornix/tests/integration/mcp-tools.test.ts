import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock the network fetchers before we import the tools
vi.mock("../../src/registry/registry-fetcher.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/registry/registry-fetcher.js")>();
  const fixtures = await import("../../src/cli/fixture-registry.js");
  
  return {
    ...actual,
    fetchRegistryIndex: vi.fn().mockImplementation(async () => {
      // Return a successful Result containing our mapped fixtures
      return {
        ok: true,
        value: {
          blocks: fixtures.FIXTURE_MANIFESTS,
          palettes: fixtures.FIXTURE_PALETTES || [],
        },
      };
    }),
  };
});

vi.mock("../../src/registry/block-fetcher.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/registry/block-fetcher.js")>();
  const fixtures = await import("../../src/cli/fixture-registry.js");
  
  return {
    ...actual,
    fetchBlocks: vi.fn().mockImplementation(async (names: string[]) => {
      // Simulate fetchBlocks mapping over the requested names and returning mock fixtures
      return names.map(name => {
        const manifest = fixtures.FIXTURE_MANIFESTS[name];
        const files = fixtures.FIXTURE_BLOCK_SOURCES[name];
        if (manifest && files) {
          return { ok: true, value: { manifest, files } };
        }
        return { ok: false, error: new Error(`Mock failed: ${name}`) };
      });
    }),
    fetchBlock: vi.fn().mockImplementation(async (name: string) => {
       const manifest = fixtures.FIXTURE_MANIFESTS[name];
       const files = fixtures.FIXTURE_BLOCK_SOURCES[name];
       if (manifest && files) {
         return { ok: true, value: { manifest, files } };
       }
       return { ok: false, error: new Error(`Mock failed: ${name}`) };
    }),
  };
});


import { listBlocksHandler } from "../../src/mcp/tools/list-blocks.js";
import { addBlock } from "../../src/mcp/tools/add-block.js";
import { removeBlock } from "../../src/mcp/tools/remove-block.js";
import { getProjectStatus } from "../../src/mcp/tools/get-project-status.js";
import { validateContent } from "../../src/mcp/tools/validate-content.js";
import { getContentSchemaHandler } from "../../src/mcp/tools/get-content-schema.js";
import { scaffoldProject } from "../../src/mcp/tools/scaffold-project.js";

// ── Helpers ─────────────────────────────────────────────────

const TEST_DIR = join(tmpdir(), "fornix-mcp-tools-test-" + Date.now());

function createTestProject(
  blocks: Array<{ name: string; version: string; variant: string; installedAt: string }> = [],
  renderMode = "server",
): void {
  mkdirSync(TEST_DIR, { recursive: true });

  const manifest = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    createdWith: "mcp",
    renderMode,
    deployTarget: "cloudflare",
    database: "none",
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      preset: "midnight",
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    },
    themeSwitcher: false,
    blocks: blocks,
  };

  writeFileSync(
    join(TEST_DIR, "fornix.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}

function readFornixJson(): Record<string, unknown> {
  const raw = readFileSync(join(TEST_DIR, "fornix.json"), "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

// ── Setup / Teardown ────────────────────────────────────────

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// ── list_blocks ─────────────────────────────────────────────

describe("listBlocks", () => {
  it("returns block names from the registry", async () => {
    const response = await listBlocksHandler({});
    
    // Check MCP structure
    expect(response.content.length).toBe(1);
    expect(response.content[0].text).toContain("hero-gradient");
  });

  it("filters blocks by type", async () => {
    const response = await listBlocksHandler({ type: "integration" });

    // Ensure it correctly parsed JSON internally
    const parsed = JSON.parse(response.content[0].text);
    for (const block of parsed) {
      expect(block.type).toBe("integration");
    }
  });

  it("filters blocks by category", async () => {
    const response = await listBlocksHandler({ category: "hero" });

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.length).toBeGreaterThan(0);
    for (const block of parsed) {
      expect(block.category).toBe("hero");
    }
  });

  it("filters blocks by search term", async () => {
    const response = await listBlocksHandler({ search: "gradient" });

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.length).toBeGreaterThan(0);
    const names = parsed.map((block: any) => block.name);
    expect(names).toContain("hero-gradient");
  });
});

// ── add_block ───────────────────────────────────────────────

describe("addBlock", () => {
  it("adds a block and creates its files", async () => {
    createTestProject();

    const result = await addBlock({
      name: "hero-gradient",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.addedBlocks).toContain("hero-gradient");
    expect(result.value.filesCreated).toBeGreaterThan(0);

    // Verify files exist on disk
    expect(
      existsSync(
        join(TEST_DIR, "src/components/sections/hero-gradient.astro"),
      ),
    ).toBe(true);

    // Verify fornix.json updated
    const manifest = readFornixJson();
    const blocks = manifest.blocks as Array<{ name: string }>;
    const blockNames = blocks.map((block) => block.name);
    expect(blockNames).toContain("hero-gradient");
  });

  it("adds dependencies automatically", async () => {
    createTestProject();

    const result = await addBlock({
      name: "auth-better-auth",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.addedBlocks).toContain("auth-better-auth");
    expect(result.value.addedBlocks).toContain("db-d1");
  });

  it("returns error for nonexistent block", async () => {
    createTestProject();

    const result = await addBlock({
      name: "nonexistent-block",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(false);
  });

  it("returns error when no fornix.json exists", async () => {
    mkdirSync(TEST_DIR, { recursive: true });

    const result = await addBlock({
      name: "hero-gradient",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(false);
  });
});

// ── remove_block ────────────────────────────────────────────

describe("removeBlock", () => {
  it("removes a block and deletes its files", async () => {
    createTestProject([
      {
        name: "hero-gradient",
        version: "1.0.0",
        variant: "default",
        installedAt: new Date().toISOString(),
      },
    ]);

    // Create the block files so they can be removed
    const blockFilePath = join(
      TEST_DIR,
      "src/components/sections/hero-gradient.astro",
    );
    mkdirSync(join(TEST_DIR, "src/components/sections"), { recursive: true });
    writeFileSync(blockFilePath, "<section>hero</section>");

    const result = await removeBlock({
      name: "hero-gradient",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.removedBlock).toBe("hero-gradient");
    expect(existsSync(blockFilePath)).toBe(false);

    const manifest = readFornixJson();
    const blocks = manifest.blocks as Array<{ name: string }>;
    const blockNames = blocks.map((block) => block.name);
    expect(blockNames).not.toContain("hero-gradient");
  });
});

// ── get_project_status ──────────────────────────────────────

describe("getProjectStatus", () => {
  it("returns manifest data from fornix.json", () => {
    createTestProject([
      {
        name: "hero-gradient",
        version: "1.0.0",
        variant: "default",
        installedAt: new Date().toISOString(),
      },
    ]);

    const result = getProjectStatus({ projectDirectory: TEST_DIR });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.renderMode).toBe("server");
    expect(result.value.deployTarget).toBe("cloudflare");
    expect(result.value.blocks.length).toBe(1);
    expect(result.value.blocks[0].name).toBe("hero-gradient");
  });

  it("returns error when no fornix.json exists", () => {
    mkdirSync(TEST_DIR, { recursive: true });

    const result = getProjectStatus({ projectDirectory: TEST_DIR });

    expect(result.ok).toBe(false);
  });
});

// ── validate_content ────────────────────────────────────────

describe("validateContent", () => {
  it("validates JSON against a block content schema", async () => {
    const result = await validateContent({
      collection: "hero-gradient",
      data: {
        headline: "Welcome to Fornix",
        subheadline: "Build faster",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(true);
  });

  it("reports validation errors for invalid data", async () => {
    const result = await validateContent({
      collection: "hero-gradient",
      data: {
        headline: 12345,
        subheadline: true,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(false);
    expect(result.value.errors.length).toBeGreaterThan(0);
  });

  it("returns error for unknown collection", async () => {
    const result = await validateContent({
      collection: "nonexistent-collection",
      data: { title: "test" },
    });

    expect(result.ok).toBe(false);
  });
});

// ── get_content_schema ──────────────────────────────────────

describe("getContentSchema", () => {
  it("returns content slot schema for a block", async () => {
    const result = await getContentSchemaHandler({ block: "hero-gradient" });

    expect(result.content[0].text).toContain("headline");
  });

  it("returns message for block without content slots", async () => {
    const result = await getContentSchemaHandler({ block: "footer-minimal" });

    expect(result.content[0].text).toContain("does not have any AI-configurable");
  });

  it("throws error for nonexistent block", async () => {
    await expect(getContentSchemaHandler({ block: "nonexistent" })).rejects.toThrow();
  });
});

// ── scaffold_project ────────────────────────────────────────

describe("scaffoldProject", () => {
  it("scaffolds a project to the specified directory", async () => {
    const projectDirectory = join(TEST_DIR, "scaffold-test");

    const result = await scaffoldProject({
      description: "A simple landing page",
      projectDirectory,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.filesCreated).toBeGreaterThan(0);
    expect(result.value.projectDirectory).toBe(projectDirectory);

    // Verify key files exist
    expect(existsSync(join(projectDirectory, "package.json"))).toBe(true);
    expect(existsSync(join(projectDirectory, "fornix.json"))).toBe(true);
    expect(existsSync(join(projectDirectory, "astro.config.mjs"))).toBe(true);
  });
});
