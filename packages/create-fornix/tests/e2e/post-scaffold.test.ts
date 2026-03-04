import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Helpers ──────────────────────────────────────────────

const CLI_PATH = join(__dirname, "../../dist/index.js");

function runCLI(args: string): string {
  return execSync(`node ${CLI_PATH} create ${args}`, {
    encoding: "utf-8",
    timeout: 180_000, // 3 min — includes pnpm install
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      FORNIX_E2E_MOCK: "true",
      // Use npm mirror for faster installs in CI/test
      npm_config_registry: "https://registry.npmmirror.com",
    },
  });
}

// ── Tests ────────────────────────────────────────────────

/**
 * These tests share a single scaffolded project to avoid repeated
 * pnpm install calls. The project is created once in beforeAll.
 */
describe("post-scaffold hooks", { timeout: 300_000 }, () => {
  let projectDir: string;
  let cliOutput: string;
  let tempBase: string;

  beforeAll(() => {
    tempBase = mkdtempSync(join(tmpdir(), "fornix-post-scaffold-"));
    projectDir = join(tempBase, "post-test");

    cliOutput = runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --yes`
    );
  }, 180_000);

  afterAll(() => {
    try {
      rmSync(tempBase, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("node_modules exists (deps installed)", () => {
    expect(existsSync(join(projectDir, "node_modules"))).toBe(true);
    // At minimum, astro should be installed
    expect(existsSync(join(projectDir, "node_modules", "astro"))).toBe(true);
  });

  it(".git directory exists with initial commit", () => {
    expect(existsSync(join(projectDir, ".git"))).toBe(true);

    // Verify there's at least one commit mentioning Fornix
    const log = execSync("git log --oneline -1", {
      cwd: projectDir,
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
      encoding: "utf-8",
    });
    expect(log).toContain("Fornix");
  });

  it("CLAUDE.md exists and contains block names", () => {
    expect(existsSync(join(projectDir, "CLAUDE.md"))).toBe(true);

    const claudeMd = readFileSync(join(projectDir, "CLAUDE.md"), "utf-8");
    expect(claudeMd).toContain("hero-gradient");
    expect(claudeMd).toContain("Astro");
    expect(claudeMd).toContain("static");
    expect(claudeMd).toContain("pnpm dev");
    expect(claudeMd).toContain("fornix add");
  });

  it("stdout contains cd and dev instructions", () => {
    expect(cliOutput).toContain("cd");
    expect(cliOutput).toContain("dev");
    expect(cliOutput).toContain("Project created successfully");
    expect(cliOutput).toContain("fornix add");
  });
});
