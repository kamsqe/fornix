import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import pc from "picocolors";

// ── Helpers ──────────────────────────────────────────────

const CLI_PATH = join(__dirname, "../../dist/index.js");

function runCLI(args: string, cwd?: string): string {
  return execSync(`node ${CLI_PATH} create ${args}`, {
    cwd: cwd ?? process.cwd(),
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function runAstroCheck(cwd: string): string {
  try {
    return execSync("npx astro check", {
      cwd,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: "pipe",
    });
  } catch (err: any) {
    console.error("Astro check failed in", cwd);
    if (err.stdout) console.error("STDOUT:", err.stdout);
    if (err.stderr) console.error("STDERR:", err.stderr);
    throw err;
  }
}


// ── Tests ────────────────────────────────────────────────

describe("recipes e2e", { timeout: 120_000 }, () => {
  const tempDirs: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "fornix-recipe-e2e-"));
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

  const recipesToTest = ["saas", "agency", "docs", "blog", "portfolio"];

  it.each(recipesToTest)(
    "scaffolds %s recipe and passes astro check",
    (recipe) => {
      const base = createTempDir();
      const projectDir = join(base, `test-recipe-${recipe}`);

      // We install dependencies here to allow `astro check` to pass
      runCLI(`${projectDir} --recipe ${recipe} --yes --install --no-git`);
      // Astro check requires typescript to process natively in monorepo
      execSync("pnpm install typescript @astrojs/check -D", { cwd: projectDir });

      expect(existsSync(join(projectDir, "package.json"))).toBe(true);

      const checkOutput = runAstroCheck(projectDir);
      // 'astro check' does not output much on success but won't throw
      expect(checkOutput).toBeDefined();
    }
  );
});
