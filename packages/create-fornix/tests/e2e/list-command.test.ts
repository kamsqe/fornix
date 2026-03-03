import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";

const PKG_DIR = join(__dirname, "../..");
const CLI = `node ${join(PKG_DIR, "dist/index.js")}`;

function run(args: string): string {
  return execSync(`${CLI} ${args}`, {
    cwd: PKG_DIR,
    encoding: "utf-8",
    timeout: 10000,
  });
}

describe("fornix list", () => {
  it("outputs block names", () => {
    const output = run("list");
    expect(output).toContain("hero-gradient");
    expect(output).toContain("footer-minimal");
    expect(output).toContain("features-grid");
    expect(output).toContain("db-d1");
    expect(output).toContain("auth-better-auth");
  });

  it("displays type headers", () => {
    const output = run("list");
    expect(output).toContain("SECTION");
    expect(output).toContain("INTEGRATION");
  });

  it("filters by --type section — only section blocks", () => {
    const output = run("list --type section");
    expect(output).toContain("hero-gradient");
    expect(output).toContain("footer-minimal");
    expect(output).toContain("features-grid");
    // Should NOT contain integration blocks
    expect(output).not.toContain("db-d1");
    expect(output).not.toContain("auth-better-auth");
  });

  it("filters by --type integration — only integration blocks", () => {
    const output = run("list --type integration");
    expect(output).toContain("db-d1");
    expect(output).toContain("auth-better-auth");
    // Should NOT contain section blocks
    expect(output).not.toContain("hero-gradient");
    expect(output).not.toContain("footer-minimal");
  });

  it("filters by --category hero", () => {
    const output = run("list --category hero");
    expect(output).toContain("hero-gradient");
    expect(output).not.toContain("footer-minimal");
    expect(output).not.toContain("db-d1");
  });

  it("outputs JSON with --json flag", () => {
    const output = run("list --json");
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    const names = parsed.map((b: { name: string }) => b.name);
    expect(names).toContain("hero-gradient");
    expect(names).toContain("db-d1");
  });

  it("JSON output respects --type filter", () => {
    const output = run("list --json --type section");
    const parsed = JSON.parse(output);
    for (const block of parsed) {
      expect(block.type).toBe("section");
    }
  });

  it("shows no results message for invalid filter", () => {
    const output = run("list --type nonexistent");
    expect(output).toContain("No blocks found");
  });
});
