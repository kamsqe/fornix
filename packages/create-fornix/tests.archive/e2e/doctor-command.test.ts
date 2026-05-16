import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { FIXTURE_MANIFESTS, FIXTURE_BLOCK_SOURCES } from "../../src/cli/fixture-registry";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "fornix-doctor-e2e-"));
}

function runDoctor(cwd: string): { stdout: string; stderr: string; code: number } {
  try {
    const output = execSync(`node ${join(__dirname, "../../dist/index.js")} doctor`, {
      cwd,
      encoding: "utf-8",
      stdio: "pipe",
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
    });
    return { stdout: output, stderr: "", code: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || "",
      code: error.status || 1,
    };
  }
}

describe("doctor command e2e", () => {

  it("detects missing fornix.json", () => {
    const dir = createTempDir();
    const result = runDoctor(dir);
    
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("No fornix.json found");
    
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes on a clean project", () => {
    const dir = createTempDir();
    
    // Create valid fornix.json
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
        }
      ]
    };
    writeFileSync(join(dir, "fornix.json"), JSON.stringify(manifest, null, 2));

    // Create block files using manifest for destinations, sources for content
    const bManifest = FIXTURE_MANIFESTS["hero-gradient"];
    const sources = FIXTURE_BLOCK_SOURCES["hero-gradient"];
    if (bManifest && sources) {
      for (const file of bManifest.files) {
        const fullPath = join(dir, file.destination);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, sources[file.source] || "dummy content");
      }
    }
    
    // hero-gradient requires content files
    const configPath = join(dir, "src/content/config.ts");
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, "// config");
    
    const contentPath = join(dir, "src/content/sections/hero-gradient.json");
    mkdirSync(dirname(contentPath), { recursive: true });
    writeFileSync(contentPath, "{}");


    const result = runDoctor(dir);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Project is healthy");
    
    rmSync(dir, { recursive: true, force: true });
  });

  it("detects orphaned block files", () => {
    const dir = createTempDir();
    
    // Create valid fornix.json with NO blocks
    const manifest = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      renderMode: "static",
      deployTarget: "cloudflare",
      blocks: [] // No blocks installed
    };
    writeFileSync(join(dir, "fornix.json"), JSON.stringify(manifest, null, 2));

    // Create orphaned file for "hero-video" using its manifest for destinations
    const orphanedManifest = FIXTURE_MANIFESTS["hero-video"];
    if (orphanedManifest && orphanedManifest.files.length > 0) {
      const file = orphanedManifest.files[0]!;
      const fullPath = join(dir, file.destination);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, "orphaned file");
    }

    const result = runDoctor(dir);
    
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Orphaned block files detected");
    expect(result.stderr).toContain("hero-video"); // Name of the orphaned block
    
    rmSync(dir, { recursive: true, force: true });
  });

  it("detects broken content collection references (missing config.ts)", () => {
    const dir = createTempDir();
    
    // Create valid fornix.json with feature-grid (has contentSlots)
    const manifest = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      renderMode: "static",
      deployTarget: "cloudflare",
      blocks: [
        {
          name: "hero-gradient", // hero-gradient uses contentSlots -> requires config.ts
          version: "1.0.0",
          variant: "default",
          installedAt: new Date().toISOString(),
        }
      ]
    };
    writeFileSync(join(dir, "fornix.json"), JSON.stringify(manifest, null, 2));

    // Create the files for hero-gradient
    const bManifest2 = FIXTURE_MANIFESTS["hero-gradient"];
    const sources2 = FIXTURE_BLOCK_SOURCES["hero-gradient"];
    if (bManifest2 && sources2) {
      for (const file of bManifest2.files) {
        const fullPath = join(dir, file.destination);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, sources2[file.source] || "dummy content");
      }
    }
    
    // Create the content file, BUT DO NOT create src/content/config.ts
    const contentPath = join(dir, "src/content/sections/hero-gradient.json");
    mkdirSync(dirname(contentPath), { recursive: true });
    writeFileSync(contentPath, "{}");

    const result = runDoctor(dir);
    
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Missing expected file: src/content/config.ts");
    
    rmSync(dir, { recursive: true, force: true });
  });

  it("detects broken content collection references (missing content json file)", () => {
    const dir = createTempDir();
    
    // Create valid fornix.json with feature-grid (has contentSlots)
    const manifest = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      renderMode: "static",
      deployTarget: "cloudflare",
      blocks: [
        {
          name: "hero-gradient", // uses contentSlots
          version: "1.0.0",
          variant: "default",
          installedAt: new Date().toISOString(),
        }
      ]
    };
    writeFileSync(join(dir, "fornix.json"), JSON.stringify(manifest, null, 2));

    // Create the files for hero-gradient
    const bManifest3 = FIXTURE_MANIFESTS["hero-gradient"];
    const sources3 = FIXTURE_BLOCK_SOURCES["hero-gradient"];
    if (bManifest3 && sources3) {
      for (const file of bManifest3.files) {
        const fullPath = join(dir, file.destination);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, sources3[file.source] || "dummy content");
      }
    }
    
    // Create config.ts so that check passes
    const configPath = join(dir, "src/content/config.ts");
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, "// config");

    // DO NOT create `src/content/sections/hero-gradient.json`
    
    const result = runDoctor(dir);
    
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Broken content reference");
    expect(result.stderr).toContain("hero-gradient.json");
    
    rmSync(dir, { recursive: true, force: true });
  });
});
