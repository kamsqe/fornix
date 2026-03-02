import { z } from "zod";

// ── Sub-schemas ───────────────────────────────────────────

const BlockSelectionSchema = z.object({
  name: z.string().min(1),
  variant: z.string().min(1),
});

const PaletteColorsSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  background: z.string().min(1),
  foreground: z.string().min(1),
});

const PaletteConfigSchema = z.object({
  preset: z.string().min(1).optional(),
  colors: PaletteColorsSchema,
});

// ── Main Schema ───────────────────────────────────────────

export const ResolvedConfigSchema = z
  .object({
    projectName: z.string().min(1),
    projectDir: z.string().min(1),
    renderMode: z.enum(["static", "hybrid", "server"]),
    deployTarget: z.enum(["cloudflare", "vercel", "netlify", "static"]),
    database: z.enum(["none", "d1", "turso", "astro-db", "postgres"]),
    cssEngine: z.enum(["tailwind", "vanilla"]),
    packageManager: z.enum(["npm", "pnpm", "bun"]),

    blocks: z.array(BlockSelectionSchema),

    locales: z
      .array(z.string().min(1))
      .transform((locales) => (locales.length === 0 ? ["en"] : locales)),
    defaultLocale: z.string().min(1),

    palette: PaletteConfigSchema,
    themeSwitcher: z.boolean().default(false),

    content: z.record(z.record(z.unknown())).optional(),
    createdWith: z.enum(["ai", "manual", "recipe", "mcp"]),
  })
  .refine(
    (config) => config.locales.includes(config.defaultLocale),
    {
      message: "defaultLocale must be included in the locales array",
      path: ["defaultLocale"],
    }
  );

// ── Derived Type ──────────────────────────────────────────

export type ResolvedConfig = z.infer<typeof ResolvedConfigSchema>;

// ── Sub-types ─────────────────────────────────────────────

export type BlockSelection = z.infer<typeof BlockSelectionSchema>;
export type PaletteColors = z.infer<typeof PaletteColorsSchema>;
export type PaletteConfig = z.infer<typeof PaletteConfigSchema>;
