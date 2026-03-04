import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ── Helpers ──────────────────────────────────────────────

const CLI_PATH = join(__dirname, "../../dist/index.js");

function runCLI(args: string, cwd?: string): string {
  return execSync(`node ${CLI_PATH} create ${args}`, {
    cwd: cwd ?? process.cwd(),
      env: { ...process.env, FORNIX_E2E_MOCK: "true" },
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

// ── Tests ────────────────────────────────────────────────

describe("create (flag-driven)", { timeout: 60_000 }, () => {
  const tempDirs: string[] = [];

  function createTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "fornix-e2e-"));
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

  it("scaffolds static + cloudflare + hero-gradient with --yes", () => {
    const base = createTempDir();
    const projectDir = join(base, "tmp-test");

    const output = runCLI(
      `${projectDir} --render static --deploy cloudflare --blocks hero-gradient --yes --no-install --no-git`
    );

    expect(output).toContain("Project created successfully");

    // Core output files
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "astro.config.mjs"))).toBe(true);
    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);
    expect(existsSync(join(projectDir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(projectDir, ".gitignore"))).toBe(true);
    expect(existsSync(join(projectDir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(projectDir, ".cursor/rules/fornix.mdc"))).toBe(true);

    // Block file placed
    expect(existsSync(join(projectDir, "src/components/sections/hero-gradient.astro"))).toBe(true);

    // package.json is valid
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("tmp-test");
    expect(pkg.dependencies.astro).toBeDefined();
  });

  it("--locales en,es produces i18n structure", () => {
    const base = createTempDir();
    const projectDir = join(base, "i18n-project");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --locales en,es --yes --no-install --no-git`
    );

    // i18n utils file
    expect(existsSync(join(projectDir, "src/i18n/utils.ts"))).toBe(true);

    // Locale-prefixed route
    expect(existsSync(join(projectDir, "src/pages/[locale]/index.astro"))).toBe(true);

    // Astro config has i18n
    const astroConfig = readFileSync(join(projectDir, "astro.config.mjs"), "utf-8");
    expect(astroConfig).toContain("i18n");
  });

  it("--palette midnight uses palette colors", () => {
    const base = createTempDir();
    const projectDir = join(base, "palette-project");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --palette midnight --yes --no-install --no-git`
    );

    // Palette CSS created
    expect(existsSync(join(projectDir, "src/styles/palettes/_current.css"))).toBe(true);

    const paletteCss = readFileSync(
      join(projectDir, "src/styles/palettes/_current.css"),
      "utf-8"
    );
    // Midnight palette primary color
    expect(paletteCss).toContain("#6366f1");
  });

  it("--theme-switcher produces multiple palette CSS files", () => {
    const base = createTempDir();
    const projectDir = join(base, "theme-project");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --palette midnight --theme-switcher --yes --no-install --no-git`
    );

    // Current palette
    expect(existsSync(join(projectDir, "src/styles/palettes/_current.css"))).toBe(true);

    // Multiple palette files from the registry
    expect(existsSync(join(projectDir, "src/styles/palettes/midnight.css"))).toBe(true);

    // Theme switcher script
    expect(existsSync(join(projectDir, "src/scripts/theme-switcher.js"))).toBe(true);
  });

  it("output directory contains package.json, astro.config.mjs, fornix.json", () => {
    const base = createTempDir();
    const projectDir = join(base, "check-files");

    runCLI(
      `${projectDir} --render static --deploy static --blocks hero-gradient --yes --no-install --no-git`
    );

    const requiredFiles = ["package.json", "astro.config.mjs", "fornix.json"];
    for (const file of requiredFiles) {
      expect(existsSync(join(projectDir, file))).toBe(true);
    }

    // fornix.json is valid
    const fornixJson = JSON.parse(readFileSync(join(projectDir, "fornix.json"), "utf-8"));
    expect(fornixJson.version).toBeDefined();
    expect(fornixJson.renderMode).toBe("static");
    expect(fornixJson.deployTarget).toBe("static");
  });

  it("--recipe saas produces correct setup and files", () => {
    const base = createTempDir();
    const projectDir = join(base, "recipe-saas-project");

    runCLI(`${projectDir} --recipe saas --yes --no-install --no-git`);

    // Verify CLAUDE.md exists
    expect(existsSync(join(projectDir, "CLAUDE.md"))).toBe(true);
    
    // Verify specific blocks
    expect(existsSync(join(projectDir, "src/components/sections/hero-video.astro"))).toBe(true);
    expect(existsSync(join(projectDir, "src/components/sections/pricing-table.astro"))).toBe(true);
    
    // Verify render mode and deploy target mapped over from recipe
    const astroConfig = readFileSync(join(projectDir, "astro.config.mjs"), "utf-8");
    expect(astroConfig).toContain("cloudflare");

    const fornixJson = JSON.parse(readFileSync(join(projectDir, "fornix.json"), "utf-8"));
    expect(fornixJson.createdWith).toBe("recipe");
    expect(fornixJson.blocks.length).toBeGreaterThan(3);
    expect(fornixJson.blocks.find((b: any) => b.name === "hero-video")).toBeDefined();
  });
});
