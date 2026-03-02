import { describe, it, expect } from "vitest";
import { ResolvedConfigSchema } from "../../src/schemas/config";

// ── Fixtures ──────────────────────────────────────────────

const validStaticConfig = {
  projectName: "my-landing",
  projectDir: "./my-landing",
  renderMode: "static" as const,
  deployTarget: "cloudflare" as const,
  database: "none" as const,
  cssEngine: "tailwind" as const,
  packageManager: "pnpm" as const,
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
  createdWith: "ai" as const,
};

const validServerConfig = {
  projectName: "saas-dashboard",
  projectDir: "./saas-dashboard",
  renderMode: "server" as const,
  deployTarget: "cloudflare" as const,
  database: "d1" as const,
  cssEngine: "tailwind" as const,
  packageManager: "pnpm" as const,
  blocks: [
    { name: "auth-better-auth", variant: "default" },
    { name: "db-d1", variant: "default" },
  ],
  locales: ["en", "es"],
  defaultLocale: "en",
  palette: {
    preset: "midnight",
    colors: {
      primary: "#6366f1",
      secondary: "#818cf8",
      accent: "#c084fc",
      background: "#0f172a",
      foreground: "#f8fafc",
    },
  },
  themeSwitcher: true,
  createdWith: "ai" as const,
};

// ── Tests ─────────────────────────────────────────────────

describe("ResolvedConfigSchema", () => {
  // ── Happy Path ──

  it("parses valid static config with 2 blocks and single locale", () => {
    const result = ResolvedConfigSchema.safeParse(validStaticConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.renderMode).toBe("static");
      expect(result.data.blocks).toHaveLength(2);
      expect(result.data.locales).toEqual(["en"]);
      expect(result.data.themeSwitcher).toBe(false);
    }
  });

  it("parses valid server config with auth+db blocks, 2 locales, palette preset", () => {
    const result = ResolvedConfigSchema.safeParse(validServerConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.renderMode).toBe("server");
      expect(result.data.database).toBe("d1");
      expect(result.data.locales).toEqual(["en", "es"]);
      expect(result.data.palette.preset).toBe("midnight");
      expect(result.data.themeSwitcher).toBe(true);
    }
  });

  // ── renderMode validation ──

  it("fails with invalid renderMode", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      renderMode: "dynamic",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid renderMode values", () => {
    for (const renderMode of ["static", "hybrid", "server"]) {
      const result = ResolvedConfigSchema.safeParse({
        ...validStaticConfig,
        renderMode,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── locales defaults ──

  it("defaults locales to ['en'] when empty array provided", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      locales: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locales).toEqual(["en"]);
    }
  });

  // ── defaultLocale validation ──

  it("fails when defaultLocale is not in locales array", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      locales: ["en"],
      defaultLocale: "es",
    });
    expect(result.success).toBe(false);
  });

  it("passes when defaultLocale is in locales array", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      locales: ["en", "es"],
      defaultLocale: "es",
    });
    expect(result.success).toBe(true);
  });

  // ── palette validation ──

  it("allows palette without preset (custom colors only)", () => {
    const { preset: _, ...colorsOnly } = validServerConfig.palette;
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      palette: colorsOnly,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.palette.preset).toBeUndefined();
      expect(result.data.palette.colors.primary).toBe("#6366f1");
    }
  });

  it("fails when palette.colors is missing entirely", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      palette: { preset: "midnight" },
    });
    expect(result.success).toBe(false);
  });

  it("fails when palette.colors is missing a required color", () => {
    const { primary: _, ...rest } = validStaticConfig.palette.colors;
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      palette: { colors: rest },
    });
    expect(result.success).toBe(false);
  });

  // ── themeSwitcher defaults ──

  it("defaults themeSwitcher to false when not provided", () => {
    const { themeSwitcher: _, ...withoutSwitch } = validStaticConfig;
    const result = ResolvedConfigSchema.safeParse(withoutSwitch);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.themeSwitcher).toBe(false);
    }
  });

  // ── deployTarget validation ──

  it("accepts all valid deployTarget values", () => {
    for (const deployTarget of ["cloudflare", "vercel", "netlify", "static"]) {
      const result = ResolvedConfigSchema.safeParse({
        ...validStaticConfig,
        deployTarget,
      });
      expect(result.success).toBe(true);
    }
  });

  it("fails with invalid deployTarget", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      deployTarget: "aws",
    });
    expect(result.success).toBe(false);
  });

  // ── database validation ──

  it("accepts all valid database values", () => {
    for (const database of ["none", "d1", "turso", "astro-db", "postgres"]) {
      const result = ResolvedConfigSchema.safeParse({
        ...validStaticConfig,
        database,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── cssEngine validation ──

  it("accepts all valid cssEngine values", () => {
    for (const cssEngine of ["tailwind", "vanilla"]) {
      const result = ResolvedConfigSchema.safeParse({
        ...validStaticConfig,
        cssEngine,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── createdWith validation ──

  it("accepts all valid createdWith values", () => {
    for (const createdWith of ["ai", "manual", "recipe", "mcp"]) {
      const result = ResolvedConfigSchema.safeParse({
        ...validStaticConfig,
        createdWith,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── content field ──

  it("accepts config with content field", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      content: {
        hero: { heading: "Welcome", subheading: "Build faster" },
        footer: { copyright: "2026 Fornix" },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content?.hero).toBeDefined();
    }
  });

  it("accepts config without content field", () => {
    const result = ResolvedConfigSchema.safeParse(validStaticConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBeUndefined();
    }
  });

  // ── blocks validation ──

  it("accepts empty blocks array", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      blocks: [],
    });
    expect(result.success).toBe(true);
  });

  it("validates block items have name and variant", () => {
    const result = ResolvedConfigSchema.safeParse({
      ...validStaticConfig,
      blocks: [{ name: "hero" }], // missing variant
    });
    expect(result.success).toBe(false);
  });
});
