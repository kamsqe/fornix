import { z } from "zod";

// ── Color validation ──────────────────────────────────────

const HexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color (e.g. #ff00aa or #fff)");

// ── Palette Schema ────────────────────────────────────────

export const PaletteSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().regex(
    /^[a-z][a-z0-9-]*$/,
    "Palette name must be kebab-case, starting with a lowercase letter"
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
});

// ── Registry (array of palettes) ──────────────────────────

export const PaletteRegistrySchema = z.array(PaletteSchema);

// ── Derived Types ─────────────────────────────────────────

export type Palette = z.infer<typeof PaletteSchema>;
export type PaletteRegistry = z.infer<typeof PaletteRegistrySchema>;
