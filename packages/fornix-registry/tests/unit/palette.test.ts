import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  PaletteSchema,
  PaletteRegistrySchema,
} from "../../src/schemas/palette";

// ── Fixtures ──────────────────────────────────────────────

const validPalette = {
  schemaVersion: 1,
  name: "midnight",
  displayName: "Midnight",
  category: "dark",
  mode: "dark" as const,
  colors: {
    primary: "#6366f1",
    secondary: "#818cf8",
    accent: "#c084fc",
    background: "#0f172a",
    foreground: "#f8fafc",
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
      expect(result.data.name).toBe("midnight");
      expect(result.data.mode).toBe("dark");
      expect(result.data.colors.primary).toBe("#6366f1");
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

  it("has at least 30 palette files", () => {
    expect(palettes.length).toBeGreaterThanOrEqual(30);
  });

  it("every palette file validates against PaletteSchema", () => {
    for (const { filename, data } of palettes) {
      const result = PaletteSchema.safeParse(data);
      expect(result.success, `${filename} failed validation: ${JSON.stringify(result.success ? null : result.error.issues)}`).toBe(true);
    }
  });

  it("no duplicate palette names", () => {
    const names = palettes.map(({ data }) => (data as { name: string }).name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("every category from registry-agent.md has at least 3 palettes", () => {
    const requiredCategories = [
      "dark",
      "light",
      "vibrant",
      "professional",
      "nature",
      "warm",
      "cool",
      "brand-inspired",
    ];

    const categoryCounts: Record<string, number> = {};
    for (const { data } of palettes) {
      const category = (data as { category: string }).category;
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }

    for (const category of requiredCategories) {
      expect(
        categoryCounts[category],
        `Category "${category}" has ${categoryCounts[category] ?? 0} palettes, needs at least 3`
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
