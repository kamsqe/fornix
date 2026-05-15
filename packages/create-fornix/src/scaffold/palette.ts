import { readFileSync } from "node:fs";
import { PaletteSchema, type Palette } from "fornix-registry";

import { ok, err, type Result } from "../utils/result.js";
import type { SchemaValidationError } from "../errors.js";
import { workspacePath } from "./workspace.js";

const PALETTE_ROOT_SEGMENTS = ["packages", "fornix-registry", "palettes"];

/**
 * Color tokens emitted into every palette CSS file.
 * Adding a token here means every palette must define it.
 */
const COLOR_TOKENS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
] as const;

export interface PaletteCss {
  name: string;
  mode: "light" | "dark";
  /** Compiled CSS — defines `--color-*` on `:root`. */
  css: string;
}

export function loadPalette(
  paletteName: string,
): Result<PaletteCss, SchemaValidationError> {
  const path = workspacePath(...PALETTE_ROOT_SEGMENTS, `${paletteName}.json`);
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

  return ok({
    name: parsed.data.name,
    mode: parsed.data.mode,
    css: renderPaletteCss(parsed.data),
  });
}

export function renderPaletteCss(palette: Palette): string {
  const lines = COLOR_TOKENS.map(
    (token) => `  --color-${token}: ${palette.colors[token]};`,
  );
  return `:root {\n${lines.join("\n")}\n  color-scheme: ${palette.mode};\n}\n`;
}

/**
 * Build a palette CSS body from inline colors (used when the caller passes
 * `palette.colors` directly without a preset name).
 */
export function renderPaletteCssFromColors(
  colors: Record<(typeof COLOR_TOKENS)[number], string>,
  mode: "light" | "dark",
): string {
  const lines = COLOR_TOKENS.map(
    (token) => `  --color-${token}: ${colors[token]};`,
  );
  return `:root {\n${lines.join("\n")}\n  color-scheme: ${mode};\n}\n`;
}
