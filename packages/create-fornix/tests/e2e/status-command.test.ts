import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PKG_DIR = join(__dirname, "../..");
const CLI = `node ${join(PKG_DIR, "dist/index.js")}`;
const TEST_DIR = join(tmpdir(), "fornix-status-test-" + Date.now());

function createTestProject(): void {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(
    join(TEST_DIR, "fornix.json"),
    JSON.stringify({
      version: "1.0.0",
      createdAt: "2026-03-03T00:00:00.000Z",
      createdWith: "create-fornix@0.0.1",
      renderMode: "server",
      deployTarget: "cloudflare",
      database: "d1",
      locales: ["en", "es"],
      defaultLocale: "en",
      palette: "midnight",
      themeSwitcher: true,
      blocks: [
        { name: "hero-gradient", version: "1.0.0", variant: "default", installedAt: "2026-03-03T00:00:00.000Z" },
        { name: "footer-minimal", version: "1.0.0", variant: "centered", installedAt: "2026-03-03T00:00:00.000Z" },
        { name: "db-d1", version: "1.0.0", variant: "default", installedAt: "2026-03-03T00:00:00.000Z" },
      ],
    }, null, 2) + "\n",
  );
}

function runStatus(args = ""): string {
  return execSync(`${CLI} status ${args}`, { cwd: TEST_DIR, encoding: "utf-8", timeout: 10000 });
}

function runStatusSafe(cwd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI} status`, { cwd, encoding: "utf-8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", exitCode: e.status ?? 1 };
  }
}

beforeEach(() => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true }); });
afterEach(() => { if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true }); });

describe("fornix status", () => {
  it("outputs block list, render mode, and deploy target", () => {
    createTestProject();
    const output = runStatus();
    expect(output).toContain("server");
    expect(output).toContain("cloudflare");
    expect(output).toContain("hero-gradient");
    expect(output).toContain("footer-minimal");
    expect(output).toContain("db-d1");
  });

  it("shows locale info and palette name", () => {
    createTestProject();
    const output = runStatus();
    expect(output).toContain("midnight");
    expect(output).toContain("en");
    expect(output).toContain("es");
  });

  it("outside a fornix project shows helpful error message", () => {
    const noProjectDir = join(tmpdir(), "fornix-no-project-" + Date.now());
    mkdirSync(noProjectDir, { recursive: true });
    const result = runStatusSafe(noProjectDir);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("No fornix.json");
    rmSync(noProjectDir, { recursive: true, force: true });
  });

  it("outputs JSON with --json flag", () => {
    createTestProject();
    const output = runStatus("--json");
    const parsed = JSON.parse(output);
    expect(parsed.renderMode).toBe("server");
    expect(parsed.deployTarget).toBe("cloudflare");
    expect(parsed.palette).toBe("midnight");
    expect(parsed.blocks.length).toBe(3);
  });

  it("shows block count", () => {
    createTestProject();
    const output = runStatus();
    expect(output).toContain("3");
  });
});
