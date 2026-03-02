import { describe, it, expect } from "vitest";
import { generateTailwindConfig } from "../../src/scaffold/config-generators/tailwind-config";
import { isOk } from "../../src/utils/result";
import type { ResolvedConfig } from "../../src/schemas/config";

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

// ── Tests ─────────────────────────────────────────────────

describe("generateTailwindConfig", () => {
  // ── Vanilla CSS Engine ──

  it("returns null when cssEngine is vanilla", () => {
    const result = generateTailwindConfig(baseConfig({ cssEngine: "vanilla" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBeNull();
    }
  });

  // ── Tailwind CSS Engine ──

  it("generates a tailwind config when cssEngine is tailwind", () => {
    const result = generateTailwindConfig(baseConfig({ cssEngine: "tailwind" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).not.toBeNull();
      expect(result.value).toContain("@theme");
    }
  });

  it("maps palette colors to Tailwind theme tokens", () => {
    const result = generateTailwindConfig(baseConfig({ cssEngine: "tailwind" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("--color-primary");
      expect(result.value).toContain("--color-secondary");
      expect(result.value).toContain("--color-accent");
      expect(result.value).toContain("--color-background");
      expect(result.value).toContain("--color-foreground");
    }
  });

  it("includes content paths for astro files", () => {
    const result = generateTailwindConfig(baseConfig({ cssEngine: "tailwind" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("src");
    }
  });

  it("produces valid CSS syntax", () => {
    const result = generateTailwindConfig(baseConfig({ cssEngine: "tailwind" }));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // Tailwind v4 CSS-based config should have @theme directive
      expect(result.value).toMatch(/@theme\s*\{/);
      expect(result.value).toContain("}");
    }
  });
});
