import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { FIXTURE_MANIFESTS } from "../../src/cli/fixture-registry";

const CLI_PATH = join(__dirname, "../../dist/index.js");

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "fornix-perf-"));
}

describe("performance benchmarks (phase 52)", () => {

  it("create --recipe saas --yes completes in < 10s (excluding install)", () => {
    const dir = createTempDir();
    const projectDir = join(dir, "perf-saas");
    mkdirSync(projectDir, { recursive: true });

    const start = performance.now();

    execSync(
      `node ${CLI_PATH} create "${projectDir}" --recipe saas --yes --no-install --no-git`,
      {
        encoding: "utf-8",
        timeout: 15000,
        stdio: "pipe",
        env: { ...process.env, FORNIX_E2E_MOCK: "true" },
      },
    );

    const elapsed = performance.now() - start;
    const elapsedSeconds = elapsed / 1000;

    console.log(`  ⏱  create --recipe saas --yes: ${elapsedSeconds.toFixed(2)}s`);
    expect(elapsedSeconds).toBeLessThan(10);

    rmSync(dir, { recursive: true, force: true });
  });

  it("add pricing-table completes in < 5s", () => {
    const dir = createTempDir();
    const projectDir = join(dir, "perf-add");
    mkdirSync(projectDir, { recursive: true });

    // Create a minimal fornix project first
    const manifest = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      renderMode: "static",
      deployTarget: "cloudflare",
      blocks: [
        {
          name: "hero-gradient",
          version: "1.0.0",
          variant: "default",
          installedAt: new Date().toISOString(),
        },
      ],
    };
    writeFileSync(join(projectDir, "fornix.json"), JSON.stringify(manifest, null, 2));

    // Create minimal file structure
    mkdirSync(join(projectDir, "src/components"), { recursive: true });
    mkdirSync(join(projectDir, "src/content/sections"), { recursive: true });
    writeFileSync(join(projectDir, "src/content/config.ts"), "// config");
    writeFileSync(join(projectDir, "package.json"), JSON.stringify({ name: "perf-add", dependencies: {} }));

    // Create hero-gradient files so project is "healthy"
    const heroManifest = FIXTURE_MANIFESTS["hero-gradient"];
    if (heroManifest) {
      for (const file of heroManifest.files) {
        const fullPath = join(projectDir, file.destination);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, "// placeholder");
      }
    }
    writeFileSync(join(projectDir, "src/content/sections/hero-gradient.json"), "{}");

    const start = performance.now();

    execSync(
      `node ${CLI_PATH} add pricing-table --no-install`,
      {
        cwd: projectDir,
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
        encoding: "utf-8",
        timeout: 10000,
        stdio: "pipe",
      },
    );

    const elapsed = performance.now() - start;
    const elapsedSeconds = elapsed / 1000;

    console.log(`  ⏱  add pricing-table: ${elapsedSeconds.toFixed(2)}s`);
    expect(elapsedSeconds).toBeLessThan(5);

    rmSync(dir, { recursive: true, force: true });
  });
});
