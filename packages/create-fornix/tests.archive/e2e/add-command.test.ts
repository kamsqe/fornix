import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PKG_DIR = join(__dirname, "../..");
const CLI = `node ${join(PKG_DIR, "dist/index.js")}`;

const TEST_DIR = join(tmpdir(), "fornix-add-test-" + Date.now());

function createTestProject(
  blocks: Array<{ name: string; version: string; variant: string }> = [],
  renderMode = "server",
): void {
  mkdirSync(TEST_DIR, { recursive: true });

  const manifest = {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    createdWith: "create-fornix@0.0.1",
    renderMode,
    deployTarget: "cloudflare",
    database: "none",
    locales: ["en"],
    defaultLocale: "en",
    palette: "midnight",
    themeSwitcher: false,
    blocks: blocks.map((b) => ({
      ...b,
      installedAt: new Date().toISOString(),
    })),
  };

  writeFileSync(
    join(TEST_DIR, "fornix.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}

function runAdd(args: string): string {
  return execSync(`${CLI} add ${args}`, {
    cwd: TEST_DIR,
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
    encoding: "utf-8",
    timeout: 10000,
  });
}

function runAddSafe(args: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI} add ${args}`, {
      cwd: TEST_DIR,
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? "", exitCode: e.status ?? 1 };
  }
}

function readFornixJson(): {
  blocks: Array<{ name: string; version: string; variant: string }>;
  [key: string]: unknown;
} {
  const raw = readFileSync(join(TEST_DIR, "fornix.json"), "utf-8");
  return JSON.parse(raw);
}

// ── Setup / Teardown ─────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────

describe("fornix add", () => {
  it("adds a block and places its files", () => {
    createTestProject();

    runAdd("hero-gradient");

    // Check files are placed
    expect(
      existsSync(
        join(TEST_DIR, "src/components/sections/hero-gradient.astro"),
      ),
    ).toBe(true);
  });

  it("adding block with dependency auto-adds the dependency", () => {
    createTestProject();

    const output = runAdd("auth-better-auth");

    // auth-better-auth requires db-d1
    // Both should now be in fornix.json
    const manifest = readFornixJson();
    const blockNames = manifest.blocks.map((b) => b.name);
    expect(blockNames).toContain("auth-better-auth");
    expect(blockNames).toContain("db-d1");

    // db-d1 files should also be placed
    expect(existsSync(join(TEST_DIR, "src/lib/db.ts"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "src/lib/auth.ts"))).toBe(true);

    // Output should mention auto-added
    expect(output).toContain("db-d1");
    expect(output).toContain("dependency");
  });

  it("fornix.json updated with new block", () => {
    createTestProject();

    runAdd("features-grid");

    const manifest = readFornixJson();
    const blockNames = manifest.blocks.map((b) => b.name);
    expect(blockNames).toContain("features-grid");

    const block = manifest.blocks.find((b) => b.name === "features-grid");
    expect(block).toBeDefined();
    expect(block?.version).toBe("1.0.0");
    expect(block?.variant).toBe("default");
  });

  it("adding already-installed block shows already installed message", () => {
    createTestProject([
      { name: "hero-gradient", version: "1.0.0", variant: "default" },
    ]);

    const output = runAdd("hero-gradient");

    expect(output).toContain("already installed");
  });

  it("does not duplicate blocks when adding same block twice", () => {
    createTestProject();

    runAdd("footer-minimal");
    const output2 = runAdd("footer-minimal");

    expect(output2).toContain("already installed");

    const manifest = readFornixJson();
    const footerBlocks = manifest.blocks.filter(
      (b) => b.name === "footer-minimal",
    );
    expect(footerBlocks.length).toBe(1);
  });
});
