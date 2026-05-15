import { describe, it, expect, afterEach } from "vitest";
import { scaffold, type ScaffoldInput } from "../../src/scaffold/pipeline";
import { isOk } from "../../src/utils/result";
import type { ResolvedConfig } from "../../src/schemas/config";
import type { BlockManifest } from "fornix-registry";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import type { FileMap } from "../../src/scaffold/structure-generator";

// ── Helpers ──────────────────────────────────────────────

function manifest(
  name: string,
  overrides: Partial<BlockManifest> = {},
): BlockManifest {
  return {
    schemaVersion: 1,
    name,
    version: "1.0.0",
    type: "section",
    description: `Block ${name}`,
    category: "test",
    tags: [],
    dependencies: {},
    requires: [],
    conflicts: [],
    envVars: [],
    variants: ["default"],
    slots: [],
    files: [
      {
        source: `${name}.astro`,
        destination: `src/components/sections/${name}.astro`,
      },
    ],
    ...overrides,
  };
}

const HERO_MANIFEST = manifest("hero-gradient");
const FOOTER_MANIFEST = manifest("footer-minimal");
const AUTH_MANIFEST = manifest("auth-better-auth", {
  type: "integration",
  requiredMode: "server",
  requires: ["db-d1"],
  envVars: [
    { name: "AUTH_SECRET", description: "Auth secret key", required: true },
  ],
  files: [
    { source: "auth-api.ts", destination: "src/pages/api/auth.ts" },
  ],
});
const DB_D1_MANIFEST = manifest("db-d1", {
  type: "integration",
  requiredMode: "server",
  envVars: [
    { name: "D1_DATABASE_ID", description: "Cloudflare D1 database ID", required: true },
  ],
  files: [
    { source: "db.ts", destination: "src/lib/db.ts" },
  ],
});

const ALL_MANIFESTS: Record<string, BlockManifest> = {
  "hero-gradient": HERO_MANIFEST,
  "footer-minimal": FOOTER_MANIFEST,
  "auth-better-auth": AUTH_MANIFEST,
  "db-d1": DB_D1_MANIFEST,
};

const BLOCK_SOURCES: Record<string, Record<string, string>> = {
  "hero-gradient": {
    "hero-gradient.astro": "<section>Hero Gradient</section>\n",
  },
  "footer-minimal": {
    "footer-minimal.astro": "<footer>Footer Minimal</footer>\n",
  },
  "auth-better-auth": {
    "auth-api.ts": "export function POST() { return new Response('ok'); }\n",
  },
  "db-d1": {
    "db.ts": "export const database = {};\n",
  },
};

function buildInput(
  configOverrides: Partial<ResolvedConfig> = {},
  inputOverrides: Partial<ScaffoldInput> = {},
): ScaffoldInput {
  return {
    config: {
      projectName: "test-project",
      projectDir: "./test-project",
      renderMode: "static",
      deployTarget: "static",
      database: "none",
      cssEngine: "vanilla",
      packageManager: "pnpm",
      blocks: [
        { name: "hero-gradient", variant: "default" },
        { name: "footer-minimal", variant: "default" },
      ],
      locales: ["en"],
      defaultLocale: "en",
      palette: {
        colors: {
          primary: "#6366f1",
          secondary: "#818cf8",
          accent: "#c084fc",
          background: "#0f172a",
          foreground: "#f8fafc",
        },
      },
      themeSwitcher: false,
      createdWith: "ai",
      ...configOverrides,
    } as ResolvedConfig,
    manifests: ALL_MANIFESTS,
    blockSources: BLOCK_SOURCES,
    blockDefaultContent: {},
    allPalettes: [],
    ...inputOverrides,
  };
}

/**
 * Write FileMap to a real directory on disk.
 */
function writeFileMapToDisk(dir: string, files: FileMap): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(dir, relativePath);
    const parentDir = join(fullPath, "..");
    mkdirSync(parentDir, { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
  }
}

/**
 * Run a shell command in the given directory, returning stdout.
 * Uses the npm mirror registry for faster installs.
 */
function run(cmd: string, cwd: string): string {
  return execSync(cmd, {
    cwd,
    encoding: "utf-8",
    timeout: 180_000, // 3 min per command
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, npm_config_registry: "https://registry.npmmirror.com" },
  });
}

/**
 * Install deps using pnpm with the mirror registry.
 */
function installDeps(dir: string): void {
  run("pnpm install --no-frozen-lockfile --registry https://registry.npmmirror.com", dir);
}

/**
 * Run astro check in the given directory.
 */
function astroCheck(dir: string): string {
  return run("npx astro check", dir);
}

// ── Tests ────────────────────────────────────────────────
// These tests are SLOW (~60-120s each): scaffold → write → pnpm install → astro check.
// They prove the scaffold output is a real, valid Astro project.

describe("scaffold → real filesystem → astro check", { timeout: 300_000 }, () => {
  const tempDirs: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "fornix-scaffold-test-"));
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

  it("static project → astro check exits 0", { timeout: 300_000 }, () => {
    const input = buildInput({
      renderMode: "static",
      deployTarget: "static",
      cssEngine: "vanilla",
      blocks: [
        { name: "hero-gradient", variant: "default" },
        { name: "footer-minimal", variant: "default" },
      ],
    });

    const result = scaffold(input);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const dir = createTempDir();
    writeFileMapToDisk(dir, result.value.files);
    installDeps(dir);

    // astro check should exit 0
    const output = astroCheck(dir);
    expect(output).toBeDefined();
  });

  it("hybrid + 2 locales → astro check exits 0", { timeout: 300_000 }, () => {
    const input = buildInput({
      renderMode: "hybrid",
      deployTarget: "cloudflare",
      cssEngine: "vanilla",
      locales: ["en", "es"],
      defaultLocale: "en",
      blocks: [
        { name: "hero-gradient", variant: "default" },
        { name: "footer-minimal", variant: "default" },
      ],
    });

    const result = scaffold(input);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const dir = createTempDir();
    writeFileMapToDisk(dir, result.value.files);
    installDeps(dir);

    const output = astroCheck(dir);
    expect(output).toBeDefined();
  });

  it("server + auth blocks → astro check exits 0", { timeout: 300_000 }, () => {
    const input = buildInput({
      renderMode: "server",
      deployTarget: "cloudflare",
      database: "d1",
      cssEngine: "vanilla",
      blocks: [
        { name: "auth-better-auth", variant: "default" },
        { name: "db-d1", variant: "default" },
      ],
    });

    const result = scaffold(input);
    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const dir = createTempDir();
    writeFileMapToDisk(dir, result.value.files);
    installDeps(dir);

    const output = astroCheck(dir);
    expect(output).toBeDefined();
  });
});
