import { z } from "zod";

// ── Primitives ────────────────────────────────────────────

const HexColorSchema = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Must be a valid hex color (e.g. #ff00aa or #fff)",
  );

/**
 * CSS length value — accepts px / rem / em / % / cqi / clamp() / etc.
 * Validated permissively so palettes can use modern CSS units without us
 * shipping a full CSS grammar.
 */
const CssLengthSchema = z.string().min(1);

/**
 * CSS timing function. Permissive — we don't want to maintain a parser.
 */
const CssEasingSchema = z.string().min(1);

/**
 * CSS box-shadow value.
 */
const CssShadowSchema = z.string().min(1);

// ── Sub-schemas (design-token groups) ─────────────────────

/**
 * Typography pairing for the palette. Headlines often use a display family
 * (serif, condensed, etc.); body always uses a comfortable sans.
 *
 * `family` is the CSS font-family stack; the corresponding `@fontsource`
 * package must be installed and loaded by the Layout template.
 */
const TypographySchema = z.object({
  headline: z.object({
    family: z.string().min(1),
    weight: z.number().int().min(100).max(900),
  }),
  body: z.object({
    family: z.string().min(1),
    weight: z.number().int().min(100).max(900),
  }),
});

/**
 * Border-radius scale. Larger values feel softer/friendlier; 0 feels
 * editorial/sharp. Every primitive reads from this scale via `--radius-md`
 * etc., never literal px.
 */
const RadiusSchema = z.object({
  sm: CssLengthSchema,
  md: CssLengthSchema,
  lg: CssLengthSchema,
  full: CssLengthSchema,
});

/**
 * Motion timing tokens. `easing.default` is the curve every primitive
 * transition uses unless explicitly overridden.
 */
const MotionSchema = z.object({
  duration: z.object({
    fast: z.string().min(1),
    normal: z.string().min(1),
    slow: z.string().min(1),
  }),
  easing: z.object({
    default: CssEasingSchema,
  }),
});

/**
 * Shadow scale. Used for cards, modals, elevated buttons.
 */
const ShadowSchema = z.object({
  sm: CssShadowSchema,
  md: CssShadowSchema,
  lg: CssShadowSchema,
});

// ── Palette Schema ────────────────────────────────────────

export const PaletteSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().regex(
    /^[a-z][a-z0-9-]*$/,
    "Palette name must be kebab-case, starting with a lowercase letter",
  ),
  displayName: z.string().min(1),
  category: z.string().min(1),
  mode: z.enum(["light", "dark"]),
  colors: z.object({
    primary: HexColorSchema,
    secondary: HexColorSchema,
    accent: HexColorSchema,
    background: HexColorSchema,
    foreground: HexColorSchema,
  }),
  typography: TypographySchema,
  radius: RadiusSchema,
  motion: MotionSchema,
  shadow: ShadowSchema,
});

// ── Registry (array of palettes) ──────────────────────────

export const PaletteRegistrySchema = z.array(PaletteSchema);

// ── Derived Types ─────────────────────────────────────────

export type Palette = z.infer<typeof PaletteSchema>;
export type PaletteRegistry = z.infer<typeof PaletteRegistrySchema>;
export type Typography = z.infer<typeof TypographySchema>;
export type Radius = z.infer<typeof RadiusSchema>;
export type Motion = z.infer<typeof MotionSchema>;
export type Shadow = z.infer<typeof ShadowSchema>;
