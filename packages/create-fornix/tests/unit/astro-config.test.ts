import { describe, it, expect } from "vitest";
import { generateAstroConfig } from "../../src/scaffold/config-generators/astro-config";
import { isOk, isErr } from "../../src/utils/result";
import type { ResolvedConfig } from "../../src/schemas/config";
import * as acorn from "acorn";

// ── Helpers ───────────────────────────────────────────────

function baseConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectName: "test-project",
    projectDir: "./test-project",
    renderMode: "static",
    deployTarget: "cloudflare",
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

function parseAsEsm(code: string): boolean {
  try {
    acorn.parse(code, { ecmaVersion: "latest", sourceType: "module" });
    return true;
  } catch {
    return false;
  }
}

// ── Tests ─────────────────────────────────────────────────

describe("generateAstroConfig", () => {
  // ── Render Mode ──

  it("sets output to 'static' for static renderMode", () => {
    const result = generateAstroConfig(baseConfig({ renderMode: "static" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("output: \"static\"");
    }
  });

  it("sets output to 'server' for server renderMode", () => {
    const result = generateAstroConfig(baseConfig({ renderMode: "server" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("output: \"server\"");
    }
  });

  it("sets output to 'hybrid' for hybrid renderMode", () => {
    const result = generateAstroConfig(baseConfig({ renderMode: "hybrid" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("output: \"hybrid\"");
    }
  });

  // ── Deploy Target / Adapter ──

  it("imports @astrojs/cloudflare for cloudflare target", () => {
    const result = generateAstroConfig(baseConfig({ deployTarget: "cloudflare" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("@astrojs/cloudflare");
      expect(result.value).toMatch(/adapter:\s*cloudflare\(/);
    }
  });

  it("imports @astrojs/vercel for vercel target", () => {
    const result = generateAstroConfig(baseConfig({ deployTarget: "vercel" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("@astrojs/vercel");
      expect(result.value).toMatch(/adapter:\s*vercel\(/);
    }
  });

  it("imports @astrojs/netlify for netlify target", () => {
    const result = generateAstroConfig(baseConfig({ deployTarget: "netlify" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("@astrojs/netlify");
      expect(result.value).toMatch(/adapter:\s*netlify\(/);
    }
  });

  it("does not include adapter for static target", () => {
    const result = generateAstroConfig(
      baseConfig({ deployTarget: "static", renderMode: "static" })
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).not.toContain("adapter:");
      expect(result.value).not.toContain("@astrojs/cloudflare");
      expect(result.value).not.toContain("@astrojs/vercel");
      expect(result.value).not.toContain("@astrojs/netlify");
    }
  });

  // ── i18n ──

  it("does not include i18n key for single locale", () => {
    const result = generateAstroConfig(
      baseConfig({ locales: ["en"], defaultLocale: "en" })
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).not.toContain("i18n");
    }
  });

  it("includes i18n config for 2 locales", () => {
    const result = generateAstroConfig(
      baseConfig({ locales: ["en", "es"], defaultLocale: "en" })
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("i18n");
      expect(result.value).toContain("defaultLocale");
      expect(result.value).toContain('"en"');
      expect(result.value).toContain('"es"');
      expect(result.value).toContain("prefixDefaultLocale");
    }
  });

  it("sets correct defaultLocale and locales for i18n", () => {
    const result = generateAstroConfig(
      baseConfig({
        locales: ["fr", "en", "de"],
        defaultLocale: "fr",
      })
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain('"fr"');
      expect(result.value).toContain('"en"');
      expect(result.value).toContain('"de"');
    }
  });

  // ── Valid JavaScript ──

  it("produces valid JavaScript (parseable by acorn)", () => {
    const result = generateAstroConfig(baseConfig());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(parseAsEsm(result.value)).toBe(true);
    }
  });

  it("produces valid JavaScript for complex config", () => {
    const result = generateAstroConfig(
      baseConfig({
        renderMode: "server",
        deployTarget: "vercel",
        locales: ["en", "es", "fr"],
        defaultLocale: "en",
      })
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(parseAsEsm(result.value)).toBe(true);
    }
  });

  it("produces valid JavaScript for static target with no adapter", () => {
    const result = generateAstroConfig(
      baseConfig({
        renderMode: "static",
        deployTarget: "static",
        locales: ["en"],
        defaultLocale: "en",
      })
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(parseAsEsm(result.value)).toBe(true);
    }
  });

  // ── defineConfig wrapping ──

  it("wraps config in defineConfig call", () => {
    const result = generateAstroConfig(baseConfig());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("defineConfig");
      expect(result.value).toMatch(/import\s*\{[\s]*defineConfig[\s]*\}\s*from\s*"astro\/config"/);

    }
  });

  // ── Default export ──

  it("exports default config", () => {
    const result = generateAstroConfig(baseConfig());
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("export default");
    }
  });
});
