import { describe, it, expect } from "vitest";
import { wireI18n } from "../../src/scaffold/i18n-wiring";
import { isOk } from "../../src/utils/result";
import type { ResolvedConfig } from "../../src/schemas/config";

// ── Fixtures ─────────────────────────────────────────────

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

describe("wireI18n", () => {
  // ── Single locale → no i18n infrastructure ──

  it("generates no files for single locale", () => {
    const result = wireI18n(
      baseConfig({ locales: ["en"], defaultLocale: "en" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(Object.keys(result.value)).toHaveLength(0);
      expect(result.value["src/i18n/utils.ts"]).toBeUndefined();
    }
  });

  // ── 2 locales → src/i18n/utils.ts exists ──

  it("generates src/i18n/utils.ts for 2 locales", () => {
    const result = wireI18n(
      baseConfig({ locales: ["en", "es"], defaultLocale: "en" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value["src/i18n/utils.ts"]).toBeDefined();
    }
  });

  // ── utils.ts exports getLocale and t ──

  it("src/i18n/utils.ts exports getLocale and t", () => {
    const result = wireI18n(
      baseConfig({ locales: ["en", "es"], defaultLocale: "en" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const utils = result.value["src/i18n/utils.ts"];
      expect(utils).toBeDefined();
      expect(utils).toContain("getLocale");
      expect(utils).toContain("export function getLocale");
      expect(utils).toMatch(/export function t[^a-zA-Z]/);
    }
  });

  // ── src/pages/[locale]/ directory exists ──

  it("generates locale-prefixed page route for 2 locales", () => {
    const result = wireI18n(
      baseConfig({ locales: ["en", "es"], defaultLocale: "en" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const filePaths = Object.keys(result.value);
      const hasLocalePrefixedRoute = filePaths.some((path) =>
        path.startsWith("src/pages/[locale]/"),
      );
      expect(hasLocalePrefixedRoute).toBe(true);
    }
  });

  // ── utils.ts contains configured locales ──

  it("includes configured locales in utils.ts", () => {
    const result = wireI18n(
      baseConfig({ locales: ["en", "fr", "de"], defaultLocale: "fr" }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const utils = result.value["src/i18n/utils.ts"];
      expect(utils).toContain('"en"');
      expect(utils).toContain('"fr"');
      expect(utils).toContain('"de"');
      expect(utils).toContain("defaultLocale");
    }
  });

  // ── 3 locales also works ──

  it("generates i18n infrastructure for 3+ locales", () => {
    const result = wireI18n(
      baseConfig({
        locales: ["en", "es", "fr"],
        defaultLocale: "en",
      }),
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value["src/i18n/utils.ts"]).toBeDefined();
      const filePaths = Object.keys(result.value);
      const hasLocalePrefixedRoute = filePaths.some((path) =>
        path.startsWith("src/pages/[locale]/"),
      );
      expect(hasLocalePrefixedRoute).toBe(true);
    }
  });
});
