import { readFileSync } from "node:fs";
import { PaletteSchema, type Palette } from "fornix-registry";

import { ok, err, type Result } from "../utils/result.js";
import type { SchemaValidationError } from "../errors.js";
import { palettePath } from "./workspace.js";

/**
 * Base color tokens — declared in every palette JSON.
 */
const COLOR_TOKENS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
] as const;

/**
 * Derived color tokens — computed via `color-mix` from the base tokens so they
 * automatically track whatever palette is loaded.
 */
const DERIVED_COLOR_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ["surface", "color-mix(in srgb, var(--color-background) 92%, var(--color-foreground) 8%)"],
  ["muted", "color-mix(in srgb, var(--color-foreground) 50%, var(--color-background) 50%)"],
  ["border", "color-mix(in srgb, var(--color-foreground) 15%, var(--color-background) 85%)"],
  ["on-primary", "var(--color-background)"],
];

export interface PaletteCss {
  name: string;
  mode: "light" | "dark";
  /** Compiled CSS — defines all design tokens on `:root`. */
  css: string;
}

const PALETTE_ROOT_SEGMENTS = ["packages", "fornix-registry", "palettes"];
void PALETTE_ROOT_SEGMENTS; // path resolved via workspace.ts helpers

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
 * Emit the full design-token CSS for a palette. Includes:
 *   · 5 base color tokens
 *   · 4 derived color tokens (color-mix-based)
 *   · typography (headline + body family, weight)
 *   · radius scale (sm/md/lg/full)
 *   · motion duration scale + default easing
 *   · shadow scale (sm/md/lg)
 *   · color-scheme hint
 *
 * Every primitive component reads from this token set, so swapping palettes
 * cascades through buttons, cards, motion, type — the whole design feel.
 */
export function renderPaletteCss(palette: Palette): string {
  const lines: string[] = [":root {"];

  // ── Colors ─────────────────────────────────────────────
  for (const token of COLOR_TOKENS) {
    lines.push(`  --color-${token}: ${palette.colors[token]};`);
  }
  for (const [token, value] of DERIVED_COLOR_TOKENS) {
    lines.push(`  --color-${token}: ${value};`);
  }

  // ── Typography ─────────────────────────────────────────
  lines.push(`  --font-headline: ${palette.typography.headline.family};`);
  lines.push(`  --font-headline-weight: ${palette.typography.headline.weight};`);
  lines.push(`  --font-body: ${palette.typography.body.family};`);
  lines.push(`  --font-body-weight: ${palette.typography.body.weight};`);

  // ── Radius scale ──────────────────────────────────────
  lines.push(`  --radius-sm: ${palette.radius.sm};`);
  lines.push(`  --radius-md: ${palette.radius.md};`);
  lines.push(`  --radius-lg: ${palette.radius.lg};`);
  lines.push(`  --radius-full: ${palette.radius.full};`);

  // ── Motion tokens ─────────────────────────────────────
  lines.push(`  --duration-fast: ${palette.motion.duration.fast};`);
  lines.push(`  --duration-normal: ${palette.motion.duration.normal};`);
  lines.push(`  --duration-slow: ${palette.motion.duration.slow};`);
  lines.push(`  --easing-default: ${palette.motion.easing.default};`);

  // ── Shadow scale ──────────────────────────────────────
  lines.push(`  --shadow-sm: ${palette.shadow.sm};`);
  lines.push(`  --shadow-md: ${palette.shadow.md};`);
  lines.push(`  --shadow-lg: ${palette.shadow.lg};`);

  // ── Browser hint ──────────────────────────────────────
  lines.push(`  color-scheme: ${palette.mode};`);
  lines.push("}");

  return lines.join("\n") + "\n";
}

/**
 * Sensible defaults for inline-color callers — typography / radius / motion /
 * shadow that match `obsidian` style. Used when scaffolding from custom
 * colors without a preset (CLI escape hatch).
 */
const DEFAULT_TYPOGRAPHY = {
  headline: { family: "'Inter', system-ui, sans-serif", weight: 700 },
  body: { family: "'Inter', system-ui, sans-serif", weight: 400 },
} as const;

const DEFAULT_RADIUS = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  full: "9999px",
} as const;

const DEFAULT_MOTION = {
  duration: { fast: "150ms", normal: "200ms", slow: "300ms" },
  easing: { default: "cubic-bezier(0.16, 1, 0.3, 1)" },
} as const;

const DEFAULT_SHADOW_DARK = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
  md: "0 4px 12px rgba(0, 0, 0, 0.45)",
  lg: "0 16px 48px rgba(0, 0, 0, 0.55)",
} as const;

const DEFAULT_SHADOW_LIGHT = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 4px 12px rgba(15, 23, 42, 0.08)",
  lg: "0 16px 48px rgba(15, 23, 42, 0.12)",
} as const;

/**
 * Build a palette CSS body from inline colors (used when the caller passes
 * `palette.colors` directly without a preset name). Fills the other token
 * groups with safe defaults that match the obsidian/paper feel.
 */
export function renderPaletteCssFromColors(
  colors: Record<(typeof COLOR_TOKENS)[number], string>,
  mode: "light" | "dark",
): string {
  const palette: Palette = {
    schemaVersion: 2,
    name: "custom",
    displayName: "Custom",
    category: "custom",
    mode,
    colors,
    typography: DEFAULT_TYPOGRAPHY,
    radius: DEFAULT_RADIUS,
    motion: DEFAULT_MOTION,
    shadow: mode === "dark" ? DEFAULT_SHADOW_DARK : DEFAULT_SHADOW_LIGHT,
  };
  return renderPaletteCss(palette);
}
