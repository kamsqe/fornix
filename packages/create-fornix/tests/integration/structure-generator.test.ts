import { describe, it, expect } from "vitest";
import { generateStructure } from "../../src/scaffold/structure-generator";
import type { ResolvedConfig } from "../../src/schemas/config";

// ── Fixtures ──────────────────────────────────────────────

function baseConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectName: "my-astro-app",
    projectDir: "./my-astro-app",
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "tailwind",
    packageManager: "pnpm",
    blocks: [],
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
    ...overrides,
  } as ResolvedConfig;
}

// ── Tests ─────────────────────────────────────────────────

describe("generateStructure", () => {
  it("creates base src/ structure and fundamental files", () => {
    const config = baseConfig();
    const files = generateStructure(config);

    expect(files["src/pages/index.astro"]).toBeDefined();
    expect(files["package.json"]).toBeDefined();
    expect(files["tsconfig.json"]).toBeDefined();
    expect(files[".gitignore"]).toBeDefined();
    // Directories are typically represented implicitly by paths, but if we need explicit dirs:
    // They usually come as empty string contents if tracking dirs, or implicitly created when writing.
  });

  it("package.json has astro dependency and correct name", () => {
    const config = baseConfig({ projectName: "awesome-site" });
    const files = generateStructure(config);
    
    const pkgString = files["package.json"];
    expect(pkgString).toBeDefined();
    const pkg = JSON.parse(pkgString as string);
    
    expect(pkg.name).toBe("awesome-site");
    expect(pkg.dependencies.astro).toBeDefined();
  });

  it("does not generate wrangler.toml when deployTarget !== 'cloudflare'", () => {
    const config = baseConfig({ deployTarget: "vercel" });
    const files = generateStructure(config);
    
    expect(files["wrangler.toml"]).toBeUndefined();
    expect(files["wrangler.json"]).toBeUndefined();
  });

  it("generates wrangler.json (or toml) when deployTarget === 'cloudflare'", () => {
    const config = baseConfig({ deployTarget: "cloudflare" });
    const files = generateStructure(config);
    
    // We check for wrangler.json or wrangler.toml. The newer standard is wrangler.json
    const hasWrangler = files["wrangler.toml"] !== undefined || files["wrangler.json"] !== undefined;
    expect(hasWrangler).toBe(true);
  });
});
