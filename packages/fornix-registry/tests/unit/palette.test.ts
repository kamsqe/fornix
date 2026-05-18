import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  PaletteSchema,
  PaletteRegistrySchema,
} from "../../src/schemas/palette";

// ── Fixtures ──────────────────────────────────────────────

// v0.3 palette shape — includes typography, radius, motion, shadow groups.
// Mirrored from palettes/obsidian.json so the test fixture stays in lockstep
// with what ships.
const validPalette = {
  schemaVersion: 2,
  name: "obsidian",
  displayName: "Obsidian",
  category: "premium-dark",
  mode: "dark" as const,
  colors: {
    primary: "#8b5cf6",
    secondary: "#6366f1",
    accent: "#06b6d4",
    background: "#0a0a0a",
    foreground: "#f4f4f5",
  },
  typography: {
    headline: { family: "'Inter', system-ui, sans-serif", weight: 700 },
    body: { family: "'Inter', system-ui, sans-serif", weight: 400 },
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  motion: {
    duration: { fast: "150ms", normal: "200ms", slow: "300ms" },
    easing: { default: "cubic-bezier(0.16, 1, 0.3, 1)" },
  },
  shadow: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
    md: "0 4px 12px rgba(0, 0, 0, 0.45)",
    lg: "0 16px 48px rgba(0, 0, 0, 0.55)",
  },
};

// ── Palette JSON loading helper ───────────────────────────

const PALETTES_DIR = join(__dirname, "../../palettes");

function loadAllPaletteFiles(): Array<{
  filename: string;
  data: unknown;
}> {
  const files = readdirSync(PALETTES_DIR).filter((file) =>
    file.endsWith(".json")
  );
  return files.map((filename) => ({
    filename,
    data: JSON.parse(readFileSync(join(PALETTES_DIR, filename), "utf-8")),
  }));
}

// ── Tests ─────────────────────────────────────────────────

describe("PaletteSchema", () => {
  // ── Happy Path ──

  it("parses a valid palette successfully", () => {
    const result = PaletteSchema.safeParse(validPalette);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("obsidian");
      expect(result.data.mode).toBe("dark");
      expect(result.data.colors.primary).toBe("#8b5cf6");
    }
  });

  // ── Missing Colors ──

  it("fails when primary color is missing", () => {
    const { primary: _, ...colorsWithoutPrimary } = validPalette.colors;
    const result = PaletteSchema.safeParse({
      ...validPalette,
      colors: colorsWithoutPrimary,
    });
    expect(result.success).toBe(false);
  });

  it("fails when secondary color is missing", () => {
    const { secondary: _, ...rest } = validPalette.colors;
    const result = PaletteSchema.safeParse({
      ...validPalette,
      colors: rest,
    });
    expect(result.success).toBe(false);
  });

  it("fails when background color is missing", () => {
    const { background: _, ...rest } = validPalette.colors;
    const result = PaletteSchema.safeParse({
      ...validPalette,
      colors: rest,
    });
    expect(result.success).toBe(false);
  });

  // ── Name Validation ──

  it("rejects uppercase in palette name", () => {
    const result = PaletteSchema.safeParse({
      ...validPalette,
      name: "Midnight",
    });
    expect(result.success).toBe(false);
  });

  it("rejects special characters in palette name", () => {
    const result = PaletteSchema.safeParse({
      ...validPalette,
      name: "mid night!",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid kebab-case palette names", () => {
    for (const name of ["midnight", "ocean-breeze", "neon-tokyo", "a"]) {
      const result = PaletteSchema.safeParse({ ...validPalette, name });
      expect(result.success).toBe(true);
    }
  });

  // ── Mode Validation ──

  it("accepts light and dark modes", () => {
    for (const mode of ["light", "dark"]) {
      const result = PaletteSchema.safeParse({ ...validPalette, mode });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid mode", () => {
    const result = PaletteSchema.safeParse({
      ...validPalette,
      mode: "auto",
    });
    expect(result.success).toBe(false);
  });

  // ── Color Format ──

  it("rejects invalid hex color format", () => {
    const result = PaletteSchema.safeParse({
      ...validPalette,
      colors: { ...validPalette.colors, primary: "not-a-color" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts 3-digit hex colors", () => {
    const result = PaletteSchema.safeParse({
      ...validPalette,
      colors: { ...validPalette.colors, primary: "#fff" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts 6-digit hex colors", () => {
    const result = PaletteSchema.safeParse({
      ...validPalette,
      colors: { ...validPalette.colors, primary: "#ff00aa" },
    });
    expect(result.success).toBe(true);
  });
});

describe("PaletteRegistrySchema", () => {
  it("parses an array of valid palettes", () => {
    const result = PaletteRegistrySchema.safeParse([
      validPalette,
      { ...validPalette, name: "obsidian", displayName: "Obsidian" },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("fails if any palette in array is invalid", () => {
    const result = PaletteRegistrySchema.safeParse([
      validPalette,
      { name: "bad" }, // missing everything
    ]);
    expect(result.success).toBe(false);
  });
});

describe("Palette JSON files", () => {
  const palettes = loadAllPaletteFiles();

  // v0.3 deliberately consolidated to 7 stunning, opinionated palettes
  // (vs v1's 32 generic ones). Each one is the canonical face of a
  // specific archetype voice. New palettes ship only when they earn it.
  it("ships the 7 v0.3 palettes — no more, no less", () => {
    expect(palettes.map(({ data }) => (data as { name: string }).name).sort()).toEqual([
      "aurora",
      "ember",
      "fraktur",
      "obsidian",
      "paper",
      "sage",
      "terracotta",
    ]);
  });

  it("every palette file validates against PaletteSchema", () => {
    for (const { filename, data } of palettes) {
      const result = PaletteSchema.safeParse(data);
      expect(
        result.success,
        `${filename} failed validation: ${JSON.stringify(result.success ? null : result.error.issues)}`,
      ).toBe(true);
    }
  });

  it("no duplicate palette names", () => {
    const names = palettes.map(({ data }) => (data as { name: string }).name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("every palette declares a non-empty category", () => {
    for (const { filename, data } of palettes) {
      const category = (data as { category?: string }).category;
      expect(
        typeof category === "string" && category.length > 0,
        `${filename} is missing a category`,
      ).toBe(true);
    }
  });
});
