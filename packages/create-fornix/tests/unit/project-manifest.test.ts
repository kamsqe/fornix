import { describe, it, expect } from "vitest";
import { ProjectManifestSchema } from "../../src/schemas/project-manifest";

// ── Fixtures ──────────────────────────────────────────────

const validManifest = {
  $schema: "https://fornix.dev/schema/fornix.json",
  version: "0.0.1",
  createdAt: "2026-03-03T02:00:00.000Z",
  createdWith: "ai" as const,
  renderMode: "server" as const,
  deployTarget: "cloudflare" as const,
  database: "d1" as const,
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
  blocks: [
    {
      name: "hero-gradient",
      version: "1.0.0",
      variant: "default",
      installedAt: "2026-03-03T02:00:00.000Z",
    },
    {
      name: "auth-better-auth",
      version: "1.0.0",
      variant: "default",
      installedAt: "2026-03-03T02:01:30.000Z",
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────

describe("ProjectManifestSchema", () => {
  // ── Happy Path ──

  it("parses a valid manifest", () => {
    const result = ProjectManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe("0.0.1");
      expect(result.data.renderMode).toBe("server");
      expect(result.data.blocks).toHaveLength(2);
    }
  });

  // ── blocks.installedAt validation ──

  it("validates installedAt as ISO datetime", () => {
    const result = ProjectManifestSchema.safeParse({
      ...validManifest,
      blocks: [
        {
          name: "hero-gradient",
          version: "1.0.0",
          variant: "default",
          installedAt: "2026-03-03T02:00:00.000Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid installedAt format", () => {
    const result = ProjectManifestSchema.safeParse({
      ...validManifest,
      blocks: [
        {
          name: "hero-gradient",
          version: "1.0.0",
          variant: "default",
          installedAt: "not-a-date",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-ISO date format in installedAt", () => {
    const result = ProjectManifestSchema.safeParse({
      ...validManifest,
      blocks: [
        {
          name: "hero-gradient",
          version: "1.0.0",
          variant: "default",
          installedAt: "03/03/2026",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  // ── Round-trip ──

  it("round-trips: create → serialize to JSON → parse back → matches", () => {
    const parseResult = ProjectManifestSchema.safeParse(validManifest);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) return;

    const serialized = JSON.stringify(parseResult.data);
    const reparsed = ProjectManifestSchema.safeParse(JSON.parse(serialized));

    expect(reparsed.success).toBe(true);
    if (reparsed.success) {
      expect(reparsed.data).toEqual(parseResult.data);
    }
  });

  // ── Missing required fields ──

  it("fails when version is missing", () => {
    const { version: _, ...rest } = validManifest;
    const result = ProjectManifestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("fails when createdAt is missing", () => {
    const { createdAt: _, ...rest } = validManifest;
    const result = ProjectManifestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("fails when blocks is missing", () => {
    const { blocks: _, ...rest } = validManifest;
    const result = ProjectManifestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  // ── Block items validation ──

  it("fails when block item is missing name", () => {
    const result = ProjectManifestSchema.safeParse({
      ...validManifest,
      blocks: [{ version: "1.0.0", variant: "default", installedAt: "2026-03-03T02:00:00.000Z" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty blocks array", () => {
    const result = ProjectManifestSchema.safeParse({
      ...validManifest,
      blocks: [],
    });
    expect(result.success).toBe(true);
  });

  // ── createdAt validation ──

  it("validates createdAt as ISO datetime", () => {
    const result = ProjectManifestSchema.safeParse({
      ...validManifest,
      createdAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});
