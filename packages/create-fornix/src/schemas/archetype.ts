import { z } from "zod";

import { SiteConfigSchema } from "./site-config.js";

// ── Sub-schemas ───────────────────────────────────────────

/**
 * Per-page declaration inside an archetype — identical shape to
 * `PageSelection` in config.ts but defined separately here so the
 * archetype-schema package doesn't depend on the runtime config schema.
 */
const ArchetypePageSchema = z.object({
  slug: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  blocks: z.array(
    z.object({
      name: z.string().min(1),
      variant: z.string().min(1).optional(),
    }),
  ),
});

// ── Main Schema ───────────────────────────────────────────

/**
 * An archetype is a pre-authored bundle: palette + site config + page
 * declarations + content overrides per block. Loading an archetype merges
 * its data into `ResolvedConfig` so the rest of the pipeline runs unchanged.
 *
 * Site config is `Partial<SiteConfig>` because archetypes don't supply
 * `locale` (that comes from CLI flags) or the auto-derived monogram (built
 * from `projectName`); they fill the parts that define the *brand voice*.
 */
export const ArchetypeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().regex(
    /^[a-z][a-z0-9-]*$/,
    "Archetype name must be kebab-case, starting with a lowercase letter",
  ),
  displayName: z.string().min(1),
  description: z.string().min(1),

  /** Default palette name. CLI may override via `--palette`. */
  palette: z.string().min(1),

  /** Brand-shaped partial of `SiteConfig`. Merged onto auto-derived defaults. */
  site: SiteConfigSchema.partial(),

  /** Routed pages — what `.astro` files to emit and which blocks each has. */
  pages: z.array(ArchetypePageSchema).min(1),

  /**
   * Content overrides keyed by block name. The shape per-block is the
   * block's `ai.contentSlots` schema; validated dynamically at scaffold
   * time by `slot-schema.ts::buildSlotSchema`.
   */
  content: z.record(z.record(z.unknown())),
});

// ── Derived Types ─────────────────────────────────────────

export type Archetype = z.infer<typeof ArchetypeSchema>;
export type ArchetypePage = z.infer<typeof ArchetypePageSchema>;
