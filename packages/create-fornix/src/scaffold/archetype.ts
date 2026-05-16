import { readFileSync } from "node:fs";

import { ok, err, type Result } from "../utils/result.js";
import type { SchemaValidationError } from "../errors.js";
import {
  ArchetypeSchema,
  type Archetype,
} from "../schemas/archetype.js";
import type { ResolvedConfig } from "../schemas/config.js";
import type { SiteConfig } from "../schemas/site-config.js";
import type { ContentByLocale } from "./render-plan.js";
import { archetypePath } from "./workspace.js";

/**
 * Load and validate an archetype JSON file by name (e.g. `"saas"`).
 *
 * Resolution: prefers bundled `dist/archetypes/<name>.json` (published CLI),
 * falls back to workspace `packages/fornix-archetypes/archetypes/<name>.json`
 * for dev. See `workspace.ts::archetypePath`.
 */
export function loadArchetype(
  name: string,
): Result<Archetype, SchemaValidationError> {
  const path = archetypePath(name);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return err({
      kind: "SchemaValidationError",
      message: `Archetype "${name}" not found at ${path}`,
      path: ["archetype"],
    });
  }
  const parsed = ArchetypeSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return err({
      kind: "SchemaValidationError",
      message: `Archetype "${name}" is invalid: ${parsed.error.message}`,
      path: parsed.error.issues[0]?.path.map(String) ?? [],
    });
  }
  return ok(parsed.data);
}

/**
 * Merge archetype data into a `ResolvedConfig`. The CLI builds a base config
 * from flags (palette, locales, deploy target, project name, dir), then this
 * function layers the archetype's site/pages/content on top.
 *
 * Conflict resolution:
 *   - `palette.preset`: archetype wins (CLI can override by passing
 *     `--palette` AFTER `--archetype`; caller controls order)
 *   - `pages`: archetype always wins (the archetype is what defines pages)
 *   - `site`: returned separately for the caller to merge with auto-derived
 *     defaults at render-plan time
 */
export interface ArchetypeOverlay {
  /** Pages declaration → goes into `ResolvedConfig.pages`. */
  pages: ResolvedConfig["pages"];
  /** Unique block names referenced across all archetype pages. */
  blockNames: string[];
  /** Partial site config → merged with auto-derived defaults. */
  site: Partial<SiteConfig>;
  /** Per-locale content overrides → `contentByLocale` for the render plan. */
  contentByLocale: ContentByLocale;
}

export function archetypeOverlay(
  archetype: Archetype,
  locales: ReadonlyArray<string>,
): ArchetypeOverlay {
  const pages: ResolvedConfig["pages"] = archetype.pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    blocks: p.blocks.map((b) => ({
      name: b.name,
      variant: b.variant ?? "default",
    })),
  }));

  const blockNamesSet = new Set<string>();
  for (const p of archetype.pages) {
    for (const b of p.blocks) blockNamesSet.add(b.name);
  }

  // For now archetype content is locale-agnostic — same copy lands in every
  // locale. AI mode (v0.4) handles real per-locale generation.
  const contentByLocale: ContentByLocale = {};
  for (const locale of locales) {
    contentByLocale[locale] = { ...archetype.content };
  }

  // Stamp the archetype name into the site config so downstream consumers
  // (AGENTS.md emitter, .fornix/project.json manifest, future `fornix add`
  // subcommands) can identify which archetype the project was built from.
  // Authors can omit `site.archetype` in the JSON; we add it here.
  const site: Partial<SiteConfig> = {
    ...archetype.site,
    archetype: archetype.site.archetype ?? archetype.name,
  };

  return {
    pages,
    blockNames: Array.from(blockNamesSet),
    site,
    contentByLocale,
  };
}
