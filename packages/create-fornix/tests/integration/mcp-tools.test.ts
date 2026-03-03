import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { listBlocks } from "../../src/mcp/tools/list-blocks.js";
import { addBlock } from "../../src/mcp/tools/add-block.js";
import { removeBlock } from "../../src/mcp/tools/remove-block.js";
import { getProjectStatus } from "../../src/mcp/tools/get-project-status.js";
import { validateContent } from "../../src/mcp/tools/validate-content.js";
import { getContentSchema } from "../../src/mcp/tools/get-content-schema.js";
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
  it("returns block names from the registry", () => {
    const result = listBlocks({});

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.length).toBeGreaterThan(0);

    const names = result.value.map((block) => block.name);
    expect(names).toContain("hero-gradient");
    expect(names).toContain("footer-minimal");
    expect(names).toContain("cta-simple");
  });

  it("filters blocks by type", () => {
    const result = listBlocks({ type: "integration" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const block of result.value) {
      expect(block.type).toBe("integration");
    }
  });

  it("filters blocks by category", () => {
    const result = listBlocks({ category: "hero" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.length).toBeGreaterThan(0);
    for (const block of result.value) {
      expect(block.category).toBe("hero");
    }
  });

  it("filters blocks by search term", () => {
    const result = listBlocks({ search: "gradient" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.length).toBeGreaterThan(0);
    const names = result.value.map((block) => block.name);
    expect(names).toContain("hero-gradient");
  });
});

// ── add_block ───────────────────────────────────────────────

describe("addBlock", () => {
  it("adds a block and creates its files", () => {
    createTestProject();

    const result = addBlock({
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

  it("adds dependencies automatically", () => {
    createTestProject();

    const result = addBlock({
      name: "auth-better-auth",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.addedBlocks).toContain("auth-better-auth");
    expect(result.value.addedBlocks).toContain("db-d1");
  });

  it("returns error for nonexistent block", () => {
    createTestProject();

    const result = addBlock({
      name: "nonexistent-block",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(false);
  });

  it("returns error when no fornix.json exists", () => {
    mkdirSync(TEST_DIR, { recursive: true });

    const result = addBlock({
      name: "hero-gradient",
      projectDirectory: TEST_DIR,
    });

    expect(result.ok).toBe(false);
  });
});

// ── remove_block ────────────────────────────────────────────

describe("removeBlock", () => {
  it("removes a block and deletes its files", () => {
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

    const result = removeBlock({
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
  it("validates JSON against a block content schema", () => {
    const result = validateContent({
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

  it("reports validation errors for invalid data", () => {
    const result = validateContent({
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

  it("returns error for unknown collection", () => {
    const result = validateContent({
      collection: "nonexistent-collection",
      data: { title: "test" },
    });

    expect(result.ok).toBe(false);
  });
});

// ── get_content_schema ──────────────────────────────────────

describe("getContentSchema", () => {
  it("returns content slot schema for a block", () => {
    const result = getContentSchema({ collection: "hero-gradient" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.collection).toBe("hero-gradient");
    expect(result.value.slots).toBeDefined();
    expect(result.value.slots.headline).toBeDefined();
    expect(result.value.slots.headline.type).toBe("string");
  });

  it("returns error for block without content slots", () => {
    const result = getContentSchema({ collection: "footer-minimal" });

    expect(result.ok).toBe(false);
  });

  it("returns error for nonexistent collection", () => {
    const result = getContentSchema({ collection: "nonexistent" });

    expect(result.ok).toBe(false);
  });
});

// ── scaffold_project ────────────────────────────────────────

describe("scaffoldProject", () => {
  it("scaffolds a project to the specified directory", () => {
    const projectDirectory = join(TEST_DIR, "scaffold-test");

    const result = scaffoldProject({
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
