import { z } from "zod";

// ── Sub-schemas ───────────────────────────────────────────

const InstalledBlockSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  variant: z.string().min(1),
  installedAt: z.string().datetime(),
});

const PaletteConfigSchema = z.object({
  preset: z.string().min(1).optional(),
  colors: z.object({
    primary: z.string().min(1),
    secondary: z.string().min(1),
    accent: z.string().min(1),
    background: z.string().min(1),
    foreground: z.string().min(1),
  }),
});

// ── Main Schema ───────────────────────────────────────────

export const ProjectManifestSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().min(1),
  createdAt: z.string().datetime(),
  createdWith: z.enum(["ai", "manual", "recipe", "mcp"]),
  renderMode: z.enum(["static", "hybrid", "server"]),
  deployTarget: z.enum(["cloudflare", "vercel", "netlify", "static"]),
  database: z.enum(["none", "d1", "turso", "astro-db", "postgres"]),
  locales: z.array(z.string().min(1)),
  defaultLocale: z.string().min(1),
  palette: PaletteConfigSchema,
  themeSwitcher: z.boolean(),
  blocks: z.array(InstalledBlockSchema),
});

// ── Derived Types ─────────────────────────────────────────

export type ProjectManifest = z.infer<typeof ProjectManifestSchema>;
export type InstalledBlock = z.infer<typeof InstalledBlockSchema>;
