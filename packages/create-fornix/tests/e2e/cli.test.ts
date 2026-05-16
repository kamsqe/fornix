/**
 * CLI e2e — exercises the bundled binary (`dist/cli.js`).
 *
 * Programmatic `scaffoldProject(config)` is covered by spine.test.ts;
 * this file verifies that the actual `npx create-fornix ...` surface
 * produces an installable, buildable project.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..", "..");
const CLI_BIN = join(PACKAGE_ROOT, "dist", "cli.js");

describe("v2 CLI (built binary)", () => {
  beforeAll(() => {
    // Build the CLI once before any test runs.
    execSync("pnpm exec tsup", {
      cwd: PACKAGE_ROOT,
      stdio: "pipe",
    });
    if (!existsSync(CLI_BIN)) {
      throw new Error(`CLI binary not built at ${CLI_BIN}`);
    }
  }, 60_000);

  it("scaffolds via the binary → installs → builds → renders", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-cli-"));
    try {
      const projectName = "cli-test-site";

      // Invoke the actual CLI binary as a subprocess, from a tmp cwd.
      execSync(
        `node ${JSON.stringify(CLI_BIN)} ${projectName} --blocks hero-gradient,features-grid,footer-minimal --palette aurora --yes`,
        { cwd: tmp, stdio: "pipe" },
      );

      const projectDir = join(tmp, projectName);
      expect(existsSync(projectDir), "project dir not created").toBe(true);
      expect(existsSync(join(projectDir, "package.json"))).toBe(true);
      expect(existsSync(join(projectDir, "astro.config.mjs"))).toBe(true);
      expect(
        existsSync(join(projectDir, "src", "pages", "index.astro")),
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "public", "styles", "palettes", "_current.css")),
      ).toBe(true);

      // Install + build through the generated project.
      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      const html = readFileSync(
        join(projectDir, "dist", "index.html"),
        "utf8",
      );
      expect(html).toContain('id="fornix-palette-link"');
      expect(html).toContain("Build Beautiful Websites Faster");
      expect(html).toContain("Everything You Need");
      expect(html).toContain("© 2026 Acme Inc.");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);

  it("exits non-zero when --blocks is empty", () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-cli-bad-"));
    try {
      let exitCode = 0;
      try {
        execSync(
          `node ${JSON.stringify(CLI_BIN)} bad-site --blocks "" --yes`,
          { cwd: tmp, stdio: "pipe" },
        );
      } catch (err) {
        exitCode = (err as { status?: number }).status ?? 0;
      }
      expect(exitCode).not.toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 30_000);

  it("exits non-zero on unknown palette", () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-cli-bad2-"));
    try {
      let exitCode = 0;
      try {
        execSync(
          `node ${JSON.stringify(CLI_BIN)} bad-palette --palette does-not-exist --yes`,
          { cwd: tmp, stdio: "pipe" },
        );
      } catch (err) {
        exitCode = (err as { status?: number }).status ?? 0;
      }
      expect(exitCode).not.toBe(0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 30_000);
});
