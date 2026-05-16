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
import { FornixMCPServer } from "../../src/mcp/server.js";
import type { Result } from "../../src/utils/result.js";

process.env.FORNIX_E2E_MOCK = "true";

// ── Helpers ─────────────────────────────────────────────────

const TEST_DIR = join(tmpdir(), "fornix-mcp-e2e-" + Date.now());

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

// ── E2E: MCP Client Tool Sequence ──────────────────────────

describe("MCP client tool sequence: list → add → status", () => {
  it("simulates a full MCP client workflow", async () => {
    const server = new FornixMCPServer();
    createTestProject();

    // Step 1: List available blocks
    const listResult = await server.callTool("list_blocks", {});

    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;

    const listData = JSON.parse(listResult.value) as Array<{ name: string }>;
    expect(listData.length).toBeGreaterThan(0);

    const availableNames = listData.map((block) => block.name);
    expect(availableNames).toContain("hero-gradient");
    expect(availableNames).toContain("features-grid");

    // Step 2: Add a block
    const addResult = await server.callTool("add_block", {
      name: "hero-gradient",
      projectDirectory: TEST_DIR,
    });

    expect(addResult.ok).toBe(true);
    if (!addResult.ok) return;

    const addData = JSON.parse(addResult.value) as {
      addedBlocks: string[];
      filesCreated: number;
    };
    expect(addData.addedBlocks).toContain("hero-gradient");
    expect(addData.filesCreated).toBeGreaterThan(0);

    // Verify file was created
    expect(
      existsSync(
        join(TEST_DIR, "src/components/sections/hero-gradient.astro"),
      ),
    ).toBe(true);

    // Step 3: Get project status
    const statusResult = await server.callTool("get_project_status", {
      projectDirectory: TEST_DIR,
    });

    expect(statusResult.ok).toBe(true);
    if (!statusResult.ok) return;

    const statusData = JSON.parse(statusResult.value) as {
      renderMode: string;
      blocks: Array<{ name: string }>;
    };
    expect(statusData.renderMode).toBe("server");
    const blockNames = statusData.blocks.map((block) => block.name);
    expect(blockNames).toContain("hero-gradient");
  });

  it("handles add → validate_content → status sequence", async () => {
    const server = new FornixMCPServer();
    createTestProject();

    // Step 1: Add a block with content slots
    const addResult = await server.callTool("add_block", {
      name: "hero-gradient",
      projectDirectory: TEST_DIR,
    });
    expect(addResult.ok).toBe(true);

    // Step 2: Validate content for the added block
    const validateResult = await server.callTool("validate_content", {
      collection: "hero-gradient",
      data: {
        headline: "Welcome to Our Site",
        subheadline: "Built with Fornix",
      },
    });
    expect(validateResult.ok).toBe(true);
    if (!validateResult.ok) return;

    const validateData = JSON.parse(validateResult.value) as {
      valid: boolean;
    };
    expect(validateData.valid).toBe(true);

    // Step 3: Check status shows the block
    const statusResult = await server.callTool("get_project_status", {
      projectDirectory: TEST_DIR,
    });
    expect(statusResult.ok).toBe(true);
    if (!statusResult.ok) return;

    const statusData = JSON.parse(statusResult.value) as {
      blocks: Array<{ name: string }>;
    };
    const blockNames = statusData.blocks.map((block) => block.name);
    expect(blockNames).toContain("hero-gradient");
  });
});
