import { z } from "zod";

// ── Sub-schemas ───────────────────────────────────────────

const BlockSelectionSchema = z.object({
  name: z.string().min(1),
  variant: z.string().min(1),
});

/**
 * Page declaration for multi-page sites. The `slug` is the route segment:
 *   `""` (empty) → `src/pages/index.astro` (the home page)
 *   `"pricing"` → `src/pages/pricing.astro` (/pricing)
 *   `"about/team"` → `src/pages/about/team.astro` (/about/team)
 *
 * Pages can be declared explicitly via `ResolvedConfig.pages`. When the
 * `pages` field is absent, the scaffolder falls back to single-page mode
 * — one home page containing every block from `ResolvedConfig.blocks`.
 */
const PageSelectionSchema = z.object({
  slug: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  blocks: z.array(BlockSelectionSchema),
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

    /**
     * Optional multi-page declaration. When set, the scaffolder emits one
     * `.astro` per page under `src/pages/{slug}.astro`. When unset, the
     * scaffolder emits a single home page containing every block from
     * `blocks`. Both modes work; archetypes use `pages` to ship 2-4 page
     * sites (saas: Home + Pricing; agency: Home + Work + About + Contact).
     */
    pages: z.array(PageSelectionSchema).optional(),

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
export type PageSelection = z.infer<typeof PageSelectionSchema>;
export type PaletteColors = z.infer<typeof PaletteColorsSchema>;
export type PaletteConfig = z.infer<typeof PaletteConfigSchema>;
