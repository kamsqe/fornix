import { describe, it, expect } from "vitest";
import {
  generatePaletteCSS,
  type PaletteCSSOutput,
} from "../../src/scaffold/config-generators/palette-css";
import { isOk } from "../../src/utils/result";
import type { PaletteConfig } from "../../src/schemas/config";
import type { Palette } from "fornix-registry";

// ── Helpers ───────────────────────────────────────────────

const customPalette: PaletteConfig = {
  colors: {
    primary: "#6366f1",
    secondary: "#818cf8",
    accent: "#c084fc",
    background: "#0f172a",
    foreground: "#f8fafc",
  },
};

const presetPalette: PaletteConfig = {
  preset: "midnight",
  colors: {
    primary: "#6366f1",
    secondary: "#818cf8",
    accent: "#c084fc",
    background: "#0f172a",
    foreground: "#f8fafc",
  },
};

function registryPalette(
  name: string,
  colors: Palette["colors"],
  mode: "light" | "dark" = "dark",
): Palette {
  return {
    schemaVersion: 1,
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    category: "custom",
    mode,
    colors,
  };
}

const MIDNIGHT_COLORS: Palette["colors"] = {
  primary: "#6366f1",
  secondary: "#818cf8",
  accent: "#c084fc",
  background: "#0f172a",
  foreground: "#f8fafc",
};

const OCEAN_COLORS: Palette["colors"] = {
  primary: "#0ea5e9",
  secondary: "#38bdf8",
  accent: "#7dd3fc",
  background: "#0c4a6e",
  foreground: "#f0f9ff",
};

const EMBER_COLORS: Palette["colors"] = {
  primary: "#ef4444",
  secondary: "#f87171",
  accent: "#fca5a5",
  background: "#450a0a",
  foreground: "#fef2f2",
};

const ALL_PALETTES: Palette[] = [
  registryPalette("midnight", MIDNIGHT_COLORS),
  registryPalette("ocean-breeze", OCEAN_COLORS),
  registryPalette("ember", EMBER_COLORS, "dark"),
];

// ── Tests ─────────────────────────────────────────────────

describe("generatePaletteCSS", () => {
  // ── CSS Custom Properties ──

  it("generates valid CSS custom properties for all color tokens", () => {
    const result = generatePaletteCSS(customPalette, false);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const current = result.value.files["src/styles/palettes/_current.css"];
      expect(current).toBeDefined();
      expect(current).toContain("--color-primary: #6366f1");
      expect(current).toContain("--color-secondary: #818cf8");
      expect(current).toContain("--color-accent: #c084fc");
      expect(current).toContain("--color-background: #0f172a");
      expect(current).toContain("--color-foreground: #f8fafc");
      expect(current).toContain(":root");
    }
  });

  // ── Preset Resolution ──

  it("resolves preset name to correct colors from registry", () => {
    const result = generatePaletteCSS(presetPalette, false, ALL_PALETTES);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const current = result.value.files["src/styles/palettes/_current.css"];
      expect(current).toContain("--color-primary: #6366f1");
      expect(current).toContain("--color-secondary: #818cf8");
    }
  });

  // ── Custom Colors (No Preset) ──

  it("works with custom colors and no preset", () => {
    const palette: PaletteConfig = {
      colors: {
        primary: "#ff0000",
        secondary: "#00ff00",
        accent: "#0000ff",
        background: "#000000",
        foreground: "#ffffff",
      },
    };
    const result = generatePaletteCSS(palette, false);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const current = result.value.files["src/styles/palettes/_current.css"];
      expect(current).toContain("--color-primary: #ff0000");
      expect(current).toContain("--color-secondary: #00ff00");
      expect(current).toContain("--color-accent: #0000ff");
      expect(current).toContain("--color-background: #000000");
      expect(current).toContain("--color-foreground: #ffffff");
    }
  });

  // ── Theme Switcher = true ──

  it("generates multiple palette CSS files when themeSwitcher is true", () => {
    const result = generatePaletteCSS(presetPalette, true, ALL_PALETTES);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const files = result.value.files;
      expect(files["src/styles/palettes/_current.css"]).toBeDefined();
      expect(files["src/styles/palettes/midnight.css"]).toBeDefined();
      expect(files["src/styles/palettes/ocean-breeze.css"]).toBeDefined();
      expect(files["src/styles/palettes/ember.css"]).toBeDefined();
    }
  });

  it("includes palette-specific colors in individual palette files", () => {
    const result = generatePaletteCSS(presetPalette, true, ALL_PALETTES);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const ocean = result.value.files["src/styles/palettes/ocean-breeze.css"];
      expect(ocean).toContain("--color-primary: #0ea5e9");
      expect(ocean).toContain("--color-background: #0c4a6e");
    }
  });

  it("generates a theme switcher script when themeSwitcher is true", () => {
    const result = generatePaletteCSS(presetPalette, true, ALL_PALETTES);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.switcherScript).toBeDefined();
      expect(result.value.switcherScript).toContain("localStorage");
    }
  });

  // ── Theme Switcher = false ──

  it("generates only _current.css when themeSwitcher is false", () => {
    const result = generatePaletteCSS(customPalette, false);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const fileKeys = Object.keys(result.value.files);
      expect(fileKeys).toEqual(["src/styles/palettes/_current.css"]);
      expect(result.value.switcherScript).toBeUndefined();
    }
  });

  // ── _current.css matches active palette ──

  it("_current.css uses the config palette colors", () => {
    const result = generatePaletteCSS(customPalette, false);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const current = result.value.files["src/styles/palettes/_current.css"];
      expect(current).toContain("--color-primary: #6366f1");
    }
  });

  // ── CSS validity ──

  it("produces CSS with proper :root selector syntax", () => {
    const result = generatePaletteCSS(customPalette, false);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const current = result.value.files["src/styles/palettes/_current.css"];
      expect(current).toMatch(/:root\s*\{/);
      expect(current).toContain("}");
    }
  });
});
