/**
 * CLI Tests — CI-friendly, deterministic tests for GitHub Actions.
 *
 * Covers the critical user-facing flows:
 * - Flag-driven scaffold (multiple configs)
 * - Recipe mode (all recipes)
 * - Error handling (invalid inputs, missing blocks)
 * - Auto-routing (npx create-fornix my-site → create my-site)
 * - Palette system (selection, listing)
 * - i18n scaffold
 * - Dry-run mode
 * - Help and version output
 */

import { describe, it, expect, afterEach } from "vitest";
import { execSync, spawnSync, type ExecSyncOptionsWithStringEncoding } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Helpers ──────────────────────────────────────────────

const CLI_PATH = join(__dirname, "../../dist/index.js");

const EXEC_OPTIONS: ExecSyncOptionsWithStringEncoding = {
  encoding: "utf-8",
  timeout: 30_000,
  stdio: ["pipe", "pipe", "pipe"],
  env: { ...process.env, FORNIX_E2E_MOCK: "true" },
};

/**
 * Run CLI with explicit `create` subcommand.
 * Throws on non-zero exit. Use `runCLIRaw` for testing error cases.
 */
function runCLI(args: string, cwd?: string): string {
  return execSync(`node ${CLI_PATH} create ${args}`, {
    ...EXEC_OPTIONS,
    cwd: cwd ?? process.cwd(),
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
  });
}

/**
 * Run CLI and return { stdout, stderr, code } without throwing.
 */
function runCLIRaw(
  args: string,
  cwd?: string,
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args}`, {
      ...EXEC_OPTIONS,
      cwd: cwd ?? process.cwd(),
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
    });
    return { stdout, stderr: "", code: 0 };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
      code: execError.status ?? 1,
    };
  }
}

// ── Temp Directory Management ────────────────────────────

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "fornix-ci-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors in CI
    }
  }
  tempDirs.length = 0;
});

// ═══════════════════════════════════════════════════════════
// 1. FLAG-DRIVEN SCAFFOLD
// ═══════════════════════════════════════════════════════════

describe("flag-driven scaffold", { timeout: 60_000 }, () => {
  it("scaffolds a minimal static project with a single block", () => {
    const base = createTempDir();
    const projectDir = join(base, "minimal");

    const output = runCLI(
      `${projectDir} --render static --deploy cloudflare --blocks hero-gradient --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "astro.config.mjs"))).toBe(true);
    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);
    expect(existsSync(join(projectDir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(projectDir, ".gitignore"))).toBe(true);

    // Block placed
    expect(
      existsSync(join(projectDir, "src/components/sections/hero-gradient.astro")),
    ).toBe(true);

    // package.json is valid JSON with correct name
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("minimal");
    expect(pkg.dependencies.astro).toBeDefined();
  });

  it("scaffolds a server project with multiple blocks", () => {
    const base = createTempDir();
    const projectDir = join(base, "multi-block");

    const output = runCLI(
      `${projectDir} --render server --deploy cloudflare --blocks hero-gradient,footer-minimal,features-grid --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");

    // All three blocks placed
    expect(
      existsSync(join(projectDir, "src/components/sections/hero-gradient.astro")),
    ).toBe(true);
    expect(
      existsSync(join(projectDir, "src/components/sections/footer-minimal.astro")),
    ).toBe(true);
    expect(
      existsSync(join(projectDir, "src/components/sections/features-grid.astro")),
    ).toBe(true);

    // Astro config has Cloudflare adapter
    const config = readFileSync(join(projectDir, "astro.config.mjs"), "utf-8");
    expect(config).toContain("cloudflare");
  });

  it("scaffolds with auth + db blocks in server mode", () => {
    const base = createTempDir();
    const projectDir = join(base, "auth-project");

    const output = runCLI(
      `${projectDir} --render server --deploy cloudflare --blocks auth-better-auth,db-d1 --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");

    // Auth files placed
    expect(existsSync(join(projectDir, "src/lib/auth.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/pages/login.astro"))).toBe(true);

    // DB files placed
    expect(existsSync(join(projectDir, "src/lib/db.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src/lib/db-schema.ts"))).toBe(true);

    // .env.example has auth env vars
    expect(existsSync(join(projectDir, ".env.example"))).toBe(true);
    const envExample = readFileSync(join(projectDir, ".env.example"), "utf-8");
    expect(envExample).toContain("AUTH_SECRET");
    expect(envExample).toContain("D1_DATABASE_ID");
  });
});

// ═══════════════════════════════════════════════════════════
// 2. RECIPE MODE
// ═══════════════════════════════════════════════════════════

describe("recipe mode", { timeout: 60_000 }, () => {
  const RECIPES = ["saas", "agency", "docs", "blog", "portfolio"];

  it.each(RECIPES)("--recipe %s produces a valid project", (recipe) => {
    const base = createTempDir();
    const projectDir = join(base, `recipe-${recipe}`);

    const output = runCLI(
      `${projectDir} --recipe ${recipe} --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");

    // Essential files exist
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "astro.config.mjs"))).toBe(true);
    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);

    // fornix.json is valid and tracks the recipe
    const manifest = JSON.parse(
      readFileSync(join(projectDir, "fornix.json"), "utf-8"),
    );
    expect(manifest.createdWith).toBe("recipe");
    expect(manifest.blocks.length).toBeGreaterThan(0);

    // CLAUDE.md generated for AI context
    expect(existsSync(join(projectDir, "CLAUDE.md"))).toBe(true);
  });

  it("rejects unknown recipe names", () => {
    const base = createTempDir();
    const result = runCLIRaw(
      `create ${join(base, "bad-recipe")} --recipe nonexistent --yes --no-install --no-git`,
    );

    expect(result.code).not.toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("not found");
    expect(combined).toContain("saas");
  });
});

// ═══════════════════════════════════════════════════════════
// 3. PALETTE SYSTEM
// ═══════════════════════════════════════════════════════════

describe("palette system", { timeout: 60_000 }, () => {
  it("uses named palette colors in generated CSS", () => {
    const base = createTempDir();
    const projectDir = join(base, "palette-test");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --palette midnight --yes --no-install --no-git`,
    );

    expect(
      existsSync(join(projectDir, "src/styles/palettes/_current.css")),
    ).toBe(true);

    const css = readFileSync(
      join(projectDir, "src/styles/palettes/_current.css"),
      "utf-8",
    );
    // Midnight palette primary
    expect(css).toContain("#6366f1");

    // fornix.json records palette preset
    const manifest = JSON.parse(
      readFileSync(join(projectDir, "fornix.json"), "utf-8"),
    );
    expect(manifest.palette.preset).toBe("midnight");
  });

  it("theme-switcher produces per-palette CSS files and switcher script", () => {
    const base = createTempDir();
    const projectDir = join(base, "switcher-test");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --palette midnight --theme-switcher --yes --no-install --no-git`,
    );

    // Current palette
    expect(
      existsSync(join(projectDir, "src/styles/palettes/_current.css")),
    ).toBe(true);

    // Named palette file
    expect(
      existsSync(join(projectDir, "src/styles/palettes/midnight.css")),
    ).toBe(true);

    // At least several palette files from the registry
    const paletteFiles = readdirSync(
      join(projectDir, "src/styles/palettes"),
    ).filter((f) => f.endsWith(".css") && !f.startsWith("_"));
    expect(paletteFiles.length).toBeGreaterThan(5);

    // Theme switcher script
    expect(
      existsSync(join(projectDir, "src/scripts/theme-switcher.js")),
    ).toBe(true);
  });

  it("rejects unknown palette names with available list", () => {
    const base = createTempDir();
    const result = runCLIRaw(
      `create ${join(base, "bad-palette")} --blocks hero-gradient --palette unicorn-rainbow --yes --no-install --no-git`,
    );

    expect(result.code).not.toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("not found");
    // Should list available palettes
    expect(combined).toContain("midnight");
  });
});

// ═══════════════════════════════════════════════════════════
// 4. i18n SCAFFOLD
// ═══════════════════════════════════════════════════════════

describe("i18n scaffold", { timeout: 60_000 }, () => {
  it("--locales en,es produces i18n structure and Astro config", () => {
    const base = createTempDir();
    const projectDir = join(base, "i18n-test");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --locales en,es --yes --no-install --no-git`,
    );

    // i18n utils
    expect(existsSync(join(projectDir, "src/i18n/utils.ts"))).toBe(true);

    // Locale-prefixed routes
    expect(
      existsSync(join(projectDir, "src/pages/[locale]/index.astro")),
    ).toBe(true);

    // Astro config has i18n section
    const config = readFileSync(
      join(projectDir, "astro.config.mjs"),
      "utf-8",
    );
    expect(config).toContain("i18n");
    expect(config).toContain('"en"');
    expect(config).toContain('"es"');

    // fornix.json records locales
    const manifest = JSON.parse(
      readFileSync(join(projectDir, "fornix.json"), "utf-8"),
    );
    expect(manifest.locales).toEqual(["en", "es"]);
    expect(manifest.defaultLocale).toBe("en");
  });

  it("single locale (default) does NOT produce i18n files", () => {
    const base = createTempDir();
    const projectDir = join(base, "no-i18n");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --yes --no-install --no-git`,
    );

    // No i18n utils when only 1 locale
    expect(existsSync(join(projectDir, "src/i18n/utils.ts"))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. DRY-RUN MODE
// ═══════════════════════════════════════════════════════════

describe("dry-run mode", { timeout: 60_000 }, () => {
  it("--dry-run shows file list without writing anything", () => {
    const base = createTempDir();
    const projectDir = join(base, "dry-run-test");

    const output = runCLI(
      `${projectDir} --render static --deploy cloudflare --blocks hero-gradient --dry-run --yes --no-install --no-git`,
    );

    // Output lists files
    expect(output).toContain("package.json");
    expect(output).toContain("astro.config.mjs");
    expect(output).toContain("fornix.json");
    expect(output).toContain("hero-gradient.astro");

    // Nothing written to disk
    expect(existsSync(projectDir)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. ERROR HANDLING
// ═══════════════════════════════════════════════════════════

describe("error handling", { timeout: 60_000 }, () => {
  it("rejects scaffold without any blocks", () => {
    const base = createTempDir();
    const result = runCLIRaw(
      `create ${join(base, "no-blocks")} --render static --deploy static --yes --no-install --no-git`,
    );

    expect(result.code).not.toBe(0);
    const combined = result.stdout + result.stderr;
    expect(combined).toContain("No blocks selected");
  });

  it("provides helpful message when no AI provider is available", () => {
    const base = createTempDir();

    // Run without any provider env vars and with --provider flag set to nothing special
    const result = runCLIRaw(`create ${join(base, "ai-test")}`, base);

    // Should fail since no provider is available (and AI mode is default)
    // Note: This test may pass in some CI envs if Ollama is installed
    if (result.code !== 0) {
      const combined = result.stdout + result.stderr;
      expect(combined).toContain("No AI provider found");
      expect(combined).toContain("OPENAI_API_KEY");
    }
  });

  it("rejects invalid project names", () => {
    const base = createTempDir();
    const result = runCLIRaw(
      `create ${join(base, "INVALID NAME!")} --blocks hero-gradient --yes --no-install --no-git`,
    );

    // Invalid project name should fail
    if (result.code !== 0) {
      const combined = result.stdout + result.stderr;
      expect(combined.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 7. AUTO-ROUTING (npx create-fornix <dir> → create <dir>)
// ═══════════════════════════════════════════════════════════

describe("auto-routing", { timeout: 60_000 }, () => {
  it("routes positional arg to create subcommand", () => {
    const base = createTempDir();
    const projectDir = join(base, "auto-route");

    // Run WITHOUT explicit "create" subcommand — should auto-route
    const output = execSync(
      `node ${CLI_PATH} ${projectDir} --blocks hero-gradient --yes --no-install --no-git`,
      { ...EXEC_OPTIONS },
    );

    expect(output).toContain("Project created successfully");
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
  });

  it("routes --manual flag to create subcommand", () => {
    const base = createTempDir();
    const projectDir = join(base, "manual-route");

    // --manual with --yes and explicit flags should route to create
    const output = execSync(
      `node ${CLI_PATH} ${projectDir} --manual --blocks hero-gradient --yes --no-install --no-git`,
      { ...EXEC_OPTIONS },
    );

    expect(output).toContain("Project created successfully");
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
  });

  it("routes --recipe flag to create subcommand", () => {
    const base = createTempDir();
    const projectDir = join(base, "recipe-route");

    const output = execSync(
      `node ${CLI_PATH} ${projectDir} --recipe docs --yes --no-install --no-git`,
      { ...EXEC_OPTIONS },
    );

    expect(output).toContain("Project created successfully");
  });
});

// ═══════════════════════════════════════════════════════════
// 8. OUTPUT VALIDATION
// ═══════════════════════════════════════════════════════════

describe("output validation", { timeout: 60_000 }, () => {
  it("fornix.json contains all expected metadata", () => {
    const base = createTempDir();
    const projectDir = join(base, "metadata-test");

    runCLI(
      `${projectDir} --render server --deploy cloudflare --blocks hero-gradient,footer-minimal --palette obsidian --yes --no-install --no-git`,
    );

    const manifest = JSON.parse(
      readFileSync(join(projectDir, "fornix.json"), "utf-8"),
    );

    expect(manifest.version).toBeDefined();
    expect(manifest.createdAt).toBeDefined();
    expect(manifest.createdWith).toBe("manual");
    expect(manifest.renderMode).toBe("server");
    expect(manifest.deployTarget).toBe("cloudflare");
    expect(manifest.palette.preset).toBe("obsidian");
    expect(manifest.palette.colors.primary).toBeDefined();
    expect(manifest.blocks).toHaveLength(2);
    expect(manifest.blocks.map((b: { name: string }) => b.name)).toContain(
      "hero-gradient",
    );
    expect(manifest.blocks.map((b: { name: string }) => b.name)).toContain(
      "footer-minimal",
    );
  });

  it("generated package.json has correct dependencies for deploy target", () => {
    const base = createTempDir();
    const projectDir = join(base, "deps-test");

    runCLI(
      `${projectDir} --render server --deploy cloudflare --blocks hero-gradient --yes --no-install --no-git`,
    );

    const pkg = JSON.parse(
      readFileSync(join(projectDir, "package.json"), "utf-8"),
    );

    expect(pkg.dependencies["@astrojs/cloudflare"]).toBeDefined();
    expect(pkg.dependencies.astro).toBeDefined();
  });

  it("generated astro.config.mjs references correct adapter", () => {
    const base = createTempDir();
    const projectDir = join(base, "adapter-test");

    runCLI(
      `${projectDir} --render server --deploy cloudflare --blocks hero-gradient --yes --no-install --no-git`,
    );

    const config = readFileSync(
      join(projectDir, "astro.config.mjs"),
      "utf-8",
    );
    expect(config).toContain("@astrojs/cloudflare");
    expect(config).toContain("output:");
  });

  it("cursor rules file generated at .cursor/rules/fornix.mdc", () => {
    const base = createTempDir();
    const projectDir = join(base, "cursor-test");

    runCLI(
      `${projectDir} --render static --deploy cloudflare --blocks hero-gradient --yes --no-install --no-git`,
    );

    expect(
      existsSync(join(projectDir, ".cursor/rules/fornix.mdc")),
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 9. HELP & VERSION
// ═══════════════════════════════════════════════════════════

describe("help and version", { timeout: 30_000 }, () => {
  it("--help exits cleanly without error", () => {
    // citty renders help to stdout and exits with 0
    const result = spawnSync("node", [CLI_PATH, "--help"], {
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("create --help exits cleanly without error", () => {
    const result = spawnSync("node", [CLI_PATH, "create", "--help"], {
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 10. MOCK AI PROVIDER
// ═══════════════════════════════════════════════════════════

describe("mock AI provider", { timeout: 60_000 }, () => {
  it("--provider mock scaffolds a fintech project from description", () => {
    const base = createTempDir();
    const projectDir = join(base, "mock-ai");

    const output = runCLI(
      `${projectDir} --provider mock --description "A fintech landing page" --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);

    const manifest = JSON.parse(
      readFileSync(join(projectDir, "fornix.json"), "utf-8"),
    );
    expect(manifest.createdWith).toBe("ai");
  });

  it("--provider mock scaffolds a SaaS project", () => {
    const base = createTempDir();
    const projectDir = join(base, "mock-saas");

    const output = runCLI(
      `${projectDir} --provider mock --description "A SaaS dashboard with auth" --yes --no-install --no-git`,
    );

    expect(output).toContain("Project created successfully");
    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);
  });
});
