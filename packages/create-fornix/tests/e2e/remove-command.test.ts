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

const TEST_DIR = join(tmpdir(), "fornix-remove-test-" + Date.now());

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

function runCli(subcommand: string, args: string): string {
  return execSync(`${CLI} ${subcommand} ${args}`, {
    cwd: TEST_DIR,
    encoding: "utf-8",
    timeout: 10000,
  });
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

describe("fornix remove", () => {
  it("add block then remove it → files gone", () => {
    createTestProject();

    // Add a block first
    runCli("add", "hero-gradient");
    expect(
      existsSync(
        join(TEST_DIR, "src/components/sections/hero-gradient.astro"),
      ),
    ).toBe(true);

    // Now remove it
    runCli("remove", "hero-gradient");

    // Files should be gone
    expect(
      existsSync(
        join(TEST_DIR, "src/components/sections/hero-gradient.astro"),
      ),
    ).toBe(false);
  });

  it("removing a block that others depend on → warning message", () => {
    createTestProject();

    // Add auth (auto-adds db-d1) then try to remove db-d1
    runCli("add", "auth-better-auth");

    const output = runCli("remove", "db-d1");

    // Should warn about dependent
    expect(output).toContain("auth-better-auth");
    expect(output).toContain("required by");

    // Block should NOT be removed (no --force)
    const manifest = readFornixJson();
    const names = manifest.blocks.map((b) => b.name);
    expect(names).toContain("db-d1");
  });

  it("fornix.json updated to remove block", () => {
    createTestProject();

    runCli("add", "features-grid");
    const before = readFornixJson();
    expect(before.blocks.map((b) => b.name)).toContain("features-grid");

    runCli("remove", "features-grid");

    const after = readFornixJson();
    expect(after.blocks.map((b) => b.name)).not.toContain("features-grid");
  });

  it("removing not-installed block shows message", () => {
    createTestProject();

    const output = runCli("remove", "hero-gradient");
    expect(output).toContain("not installed");
  });

  it("--force removes block even with dependents", () => {
    createTestProject();

    runCli("add", "auth-better-auth");

    runCli("remove", "db-d1 --force");

    const manifest = readFornixJson();
    const names = manifest.blocks.map((b) => b.name);
    expect(names).not.toContain("db-d1");
    // auth-better-auth still there but db-d1 removed
    expect(names).toContain("auth-better-auth");
  });
});
