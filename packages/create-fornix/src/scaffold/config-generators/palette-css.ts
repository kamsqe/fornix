import type { Palette } from "fornix-registry";
import type { PaletteConfig, PaletteColors } from "../../schemas/config.js";
import { ok, err, type Result } from "../../utils/result.js";

// ── Output Type ──────────────────────────────────────────

export interface PaletteCSSOutput {
  readonly files: Record<string, string>;
  readonly switcherScript?: string;
}

// ── Constants ────────────────────────────────────────────

const COLOR_TOKENS: ReadonlyArray<keyof PaletteColors> = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
];

const CURRENT_PATH = "src/styles/palettes/_current.css";

// ── Public API ───────────────────────────────────────────

export function generatePaletteCSS(
  palette: PaletteConfig,
  themeSwitcher: boolean,
  allPalettes?: ReadonlyArray<Palette>,
): Result<PaletteCSSOutput, Error> {
  try {
    const files: Record<string, string> = {};

    files[CURRENT_PATH] = buildPaletteFile(palette.colors);

    if (themeSwitcher && allPalettes && allPalettes.length > 0) {
      for (const registryPalette of allPalettes) {
        const path = `src/styles/palettes/${registryPalette.name}.css`;
        files[path] = buildPaletteFile(registryPalette.colors);
      }

      const paletteNames = allPalettes.map((palette) => palette.name);
      const script = buildSwitcherScript(paletteNames);

      return ok({ files, switcherScript: script });
    }

    return ok({ files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to generate palette CSS: ${message}`));
  }
}

// ── Internals ────────────────────────────────────────────

function buildPaletteFile(colors: PaletteColors): string {
  const properties = COLOR_TOKENS.map(
    (token) => `  --color-${token}: ${colors[token]};`,
  ).join("\n");

  return `:root {\n${properties}\n}\n`;
}

function buildSwitcherScript(paletteNames: ReadonlyArray<string>): string {
  return `(function () {
  const PALETTES = ${JSON.stringify(paletteNames)};
  const STORAGE_KEY = "fornix-palette";

  function loadPalette(name) {
    const link = document.getElementById("fornix-palette-link");
    if (link) {
      link.setAttribute("href", "/styles/palettes/" + name + ".css");
    }
    localStorage.setItem(STORAGE_KEY, name);
  }

  function getCurrentPalette() {
    return localStorage.getItem(STORAGE_KEY) || PALETTES[0];
  }

  document.addEventListener("DOMContentLoaded", function () {
    const saved = getCurrentPalette();
    loadPalette(saved);
  });

  window.__fornixSwitchPalette = loadPalette;
  window.__fornixPalettes = PALETTES;
})();
`;
}
