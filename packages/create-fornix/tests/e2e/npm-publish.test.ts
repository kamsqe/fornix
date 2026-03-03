import { describe, it, expect, beforeAll } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

const CLI_PATH = join(__dirname, "../../dist/index.js");

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "fornix-publish-e2e-"));
}

describe("npm publish readiness (phase 54)", () => {
  beforeAll(() => {
    execSync("pnpm run build", { cwd: join(__dirname, "../..") });
  });

  it("dist/index.js has Node shebang for bin execution", () => {
    const content = readFileSync(CLI_PATH, "utf-8");
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("package.json has correct bin, files, name, and license", () => {
    const pkgPath = join(__dirname, "../../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    expect(pkg.name).toBe("create-fornix");
    expect(pkg.license).toBe("MIT");
    expect(pkg.bin["create-fornix"]).toBe("./dist/index.js");
    expect(pkg.bin["fornix"]).toBe("./dist/index.js");
    expect(pkg.files).toContain("dist");
    expect(pkg.type).toBe("module");
  });

  it("create-fornix --help works (simulates npx)", () => {
    // Verify the CLI binary runs and exits cleanly with --help
    // (citty outputs help to process.stdout which vitest intercepts,
    // so we only verify exit code 0 = no crash)
    let exitCode = 0;
    try {
      execSync(`node ${CLI_PATH} --help`, {
        timeout: 5000,
        stdio: "ignore",
      });
    } catch {
      exitCode = 1;
    }
    expect(exitCode).toBe(0);
  });

  it("create-fornix ./my-site --recipe saas --yes → project created", () => {
    const dir = createTempDir();
    const projectDir = join(dir, "my-site");
    mkdirSync(projectDir, { recursive: true });

    execSync(
      `node ${CLI_PATH} create "${projectDir}" --recipe saas --yes --no-install --no-git`,
      { encoding: "utf-8", timeout: 15000, stdio: "pipe" },
    );

    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "astro.config.mjs"))).toBe(true);

    // Verify fornix.json has blocks from saas recipe
    const fornixJson = JSON.parse(readFileSync(join(projectDir, "fornix.json"), "utf-8"));
    const blockNames = fornixJson.blocks.map((b: Record<string, unknown>) => b.name);
    expect(blockNames).toContain("hero-video");
    expect(blockNames).toContain("pricing-table");
    expect(blockNames).toContain("auth-better-auth");

    rmSync(dir, { recursive: true, force: true });
  });
});
