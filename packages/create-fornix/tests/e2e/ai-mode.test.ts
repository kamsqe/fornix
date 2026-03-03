/**
 * E2E tests for AI mode in the create command.
 *
 * Tests:
 * - AI mode with mock provider scaffolds a valid project
 * - --manual --yes uses flag-driven mode, no AI
 */

import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Helpers ──────────────────────────────────────────────

const CLI_PATH = join(__dirname, "../../dist/index.js");

function runCLI(args: string): string {
  return execSync(`node ${CLI_PATH} create ${args}`, {
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

// ── Tests ────────────────────────────────────────────────

describe("create (AI mode)", { timeout: 60_000 }, () => {
  const tempDirs: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "fornix-ai-e2e-"));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    tempDirs.length = 0;
  });

  it("AI mode with mock provider scaffolds a project", () => {
    const base = createTempDir();
    const projectDir = join(base, "ai-test");

    const output = runCLI(
      `${projectDir} --provider mock --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");

    // Core output files
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "astro.config.mjs"))).toBe(true);
    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);
    expect(existsSync(join(projectDir, "tsconfig.json"))).toBe(true);

    // fornix.json should show createdWith: "ai"
    const fornixJson = JSON.parse(
      readFileSync(join(projectDir, "fornix.json"), "utf-8"),
    );
    expect(fornixJson.createdWith).toBe("ai");

    // AI should have selected blocks
    expect(fornixJson.blocks.length).toBeGreaterThan(0);
  });

  it("--manual --yes uses flag-driven mode without AI", () => {
    const base = createTempDir();
    const projectDir = join(base, "manual-test");

    const output = runCLI(
      `${projectDir} --manual --render static --deploy static --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");

    const fornixJson = JSON.parse(
      readFileSync(join(projectDir, "fornix.json"), "utf-8"),
    );
    expect(fornixJson.createdWith).toBe("manual");
    expect(fornixJson.renderMode).toBe("static");
    expect(fornixJson.deployTarget).toBe("static");
  });
});
