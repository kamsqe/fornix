import { readFileSync } from "node:fs";
import { PaletteSchema, type Palette } from "fornix-registry";

import { ok, err, type Result } from "../utils/result.js";
import type { SchemaValidationError } from "../errors.js";
import { palettePath } from "./workspace.js";

/**
 * Load the raw palette JSON for a preset.
 * Used by callers that need the colors (e.g. building `ResolvedConfig`)
 * before handing off to `scaffoldProject`.
 */
export function loadPaletteData(
  paletteName: string,
): Result<Palette, SchemaValidationError> {
  const path = palettePath(paletteName);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return err({
      kind: "SchemaValidationError",
      message: `Palette "${paletteName}" not found at ${path}`,
      path: ["palette", "preset"],
    });
  }
  const parsed = PaletteSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return err({
      kind: "SchemaValidationError",
      message: `Palette "${paletteName}" is invalid: ${parsed.error.message}`,
      path: parsed.error.issues[0]?.path.map(String) ?? [],
    });
  }
  return ok(parsed.data);
}

/**
 * Base color tokens — declared in every palette JSON.
 * Adding a token here means every palette must define it.
 */
const COLOR_TOKENS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
] as const;

/**
 * Derived tokens emitted into every palette CSS — computed via `color-mix`
 * so they automatically track the base tokens of whichever palette is loaded.
 *
 * Why: block CSS references `--color-surface`, `--color-muted`, `--color-border`,
 * `--color-on-primary` (audit findings) but earlier palette CSS only emitted
 * the 5 base tokens. Light palettes inherited block-CSS fallback hex values
 * (dark navy) and broke contrast catastrophically.
 *
 * Derivation strategy is palette-agnostic — same recipe works for light and dark.
 */
const DERIVED_TOKENS: ReadonlyArray<readonly [string, string]> = [
  // A nudge off background, used for cards/containers that need to lift
  // visually without changing the page color.
  ["surface", "color-mix(in srgb, var(--color-background) 92%, var(--color-foreground) 8%)"],
  // 50/50 blend — neutral mid-gray on both light and dark palettes.
  ["muted", "color-mix(in srgb, var(--color-foreground) 50%, var(--color-background) 50%)"],
  // Subtle outline — fades into the background.
  ["border", "color-mix(in srgb, var(--color-foreground) 15%, var(--color-background) 85%)"],
  // What you put on top of a `--color-primary` button. Tracks background
  // so it inverts cleanly across light/dark palettes.
  ["on-primary", "var(--color-background)"],
];

export interface PaletteCss {
  name: string;
  mode: "light" | "dark";
  /** Compiled CSS — defines `--color-*` on `:root`. */
  css: string;
}

export function loadPalette(
  paletteName: string,
): Result<PaletteCss, SchemaValidationError> {
  const data = loadPaletteData(paletteName);
  if (!data.ok) return data;
  return ok({
    name: data.value.name,
    mode: data.value.mode,
    css: renderPaletteCss(data.value),
  });
}

/**
 * Loader for the palette `.json` file (left for callers that want only the
 * raw data without rendered CSS). Now an alias for `loadPaletteData` —
 * removed because all consumers already use `loadPaletteData`.
 */

export function renderPaletteCss(palette: Palette): string {
  return renderPaletteCssFromColors(palette.colors, palette.mode);
}

/**
 * Build a palette CSS body from inline colors. Emits the 5 base tokens
 * declared by the palette + 4 derived tokens (surface, muted, border,
 * on-primary) computed via `color-mix` so the whole token set tracks
 * the palette automatically.
 */
export function renderPaletteCssFromColors(
  colors: Record<(typeof COLOR_TOKENS)[number], string>,
  mode: "light" | "dark",
): string {
  const baseLines = COLOR_TOKENS.map(
    (token) => `  --color-${token}: ${colors[token]};`,
  );
  const derivedLines = DERIVED_TOKENS.map(
    ([token, value]) => `  --color-${token}: ${value};`,
  );
  return `:root {\n${baseLines.join("\n")}\n${derivedLines.join("\n")}\n  color-scheme: ${mode};\n}\n`;
}
