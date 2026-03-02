import { describe, it, expect } from "vitest";
import { validateConfig } from "../../src/scaffold/config-validator";
import { isOk, isErr } from "../../src/utils/result";
import type { ResolvedConfig } from "../../src/schemas/config";
import type { BlockManifest } from "fornix-registry";

// ── Helpers ───────────────────────────────────────────────

function manifest(
  name: string,
  overrides: Partial<BlockManifest> = {}
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
    files: [{ source: `${name}.astro`, destination: `src/components/${name}.astro` }],
    ...overrides,
  };
}

const manifests: Record<string, BlockManifest> = {
  "hero-gradient": manifest("hero-gradient"),
  "footer-minimal": manifest("footer-minimal"),
  "auth-better-auth": manifest("auth-better-auth", {
    type: "integration",
    requiredMode: "server",
    requires: ["db-d1"],
  }),
  "db-d1": manifest("db-d1", { type: "integration", requiredMode: "server" }),
};

function baseConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectName: "test-project",
    projectDir: "./test-project",
    renderMode: "static",
    deployTarget: "cloudflare",
    database: "none",
    cssEngine: "tailwind",
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
    ...overrides,
  } as ResolvedConfig;
}

// ── Tests ─────────────────────────────────────────────────

describe("validateConfig", () => {
  // ── Happy Path ──

  it("passes for valid static config", () => {
    const result = validateConfig(baseConfig(), manifests);
    expect(isOk(result)).toBe(true);
  });

  it("passes for valid server+auth config", () => {
    const config = baseConfig({
      renderMode: "server",
      database: "d1",
      blocks: [
        { name: "auth-better-auth", variant: "default" },
        { name: "db-d1", variant: "default" },
      ],
    });
    const result = validateConfig(config, manifests);
    expect(isOk(result)).toBe(true);
  });

  // ── requiredMode conflict ──

  it("errors when auth block appears in static mode", () => {
    const config = baseConfig({
      renderMode: "static",
      blocks: [
        { name: "auth-better-auth", variant: "default" },
      ],
    });
    const result = validateConfig(config, manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      const messages = result.error.map((e) => e.message);
      expect(messages.some((m) => m.includes("auth-better-auth") && m.includes("server"))).toBe(true);
    }
  });

  // ── database + static conflict ──

  it("errors when database is d1 with static mode", () => {
    const config = baseConfig({
      renderMode: "static",
      database: "d1",
    });
    const result = validateConfig(config, manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      const messages = result.error.map((e) => e.message);
      expect(messages.some((m) => m.includes("database") || m.includes("d1"))).toBe(true);
    }
  });

  // ── block not in manifests ──

  it("errors when a selected block is not in manifests", () => {
    const config = baseConfig({
      blocks: [{ name: "nonexistent-block", variant: "default" }],
    });
    const result = validateConfig(config, manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      const messages = result.error.map((e) => e.message);
      expect(messages.some((m) => m.includes("nonexistent-block"))).toBe(true);
    }
  });

  // ── defaultLocale not in locales ──

  it("errors when defaultLocale is not in locales", () => {
    const config = baseConfig({
      locales: ["en"],
      defaultLocale: "es",
    } as Partial<ResolvedConfig>);
    const result = validateConfig(config, manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      const messages = result.error.map((e) => e.message);
      expect(messages.some((m) => m.includes("defaultLocale") || m.includes("es"))).toBe(true);
    }
  });

  // ── Multiple errors collected ──

  it("collects multiple validation errors at once", () => {
    const config = baseConfig({
      renderMode: "static",
      database: "d1",
      blocks: [{ name: "auth-better-auth", variant: "default" }],
    });
    const result = validateConfig(config, manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      // Should have at least 2 errors: database+static AND auth+static
      expect(result.error.length).toBeGreaterThanOrEqual(2);
    }
  });

  // ── Edge: hybrid mode allows server blocks ──

  it("passes when server-required block is in hybrid mode", () => {
    const config = baseConfig({
      renderMode: "hybrid",
      blocks: [{ name: "auth-better-auth", variant: "default" }],
    });
    const result = validateConfig(config, manifests);
    expect(isOk(result)).toBe(true);
  });
});
