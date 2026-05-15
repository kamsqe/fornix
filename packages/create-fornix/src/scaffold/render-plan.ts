import type { BlockManifest } from "fornix-registry";

import type { ResolvedConfig } from "../schemas/config.js";
import type { BlockSource } from "./blocks.js";
import type { PaletteCss } from "./palette.js";

/**
 * The intermediate representation between `ResolvedConfig` and emitted files.
 *
 * Everything downstream (file generation) projects from this plan.
 * The plan is JSON-serializable so it can be inspected via `--dry-run`
 * and asserted against in tests.
 */
export interface RenderPlan {
  projectName: string;
  projectDir: string;

  locale: string;
  locales: ReadonlyArray<string>;

  palette: PaletteCss;

  layout: {
    title: string;
    description: string;
  };

  /**
   * Section blocks in the order they should appear on `index.astro`.
   * Layout/integration/feature blocks are not handled by the day-1 spine.
   */
  sectionBlocks: ReadonlyArray<BlockSource>;

  /**
   * Content entries to write under `src/content/sections/`.
   * One per (block × locale) combination.
   */
  contentEntries: ReadonlyArray<{
    locale: string;
    blockName: string;
    /** Path relative to project root, e.g. `src/content/sections/hero-gradient.json` */
    path: string;
    data: Record<string, unknown>;
  }>;

  /**
   * NPM dependencies to merge into the generated `package.json`.
   */
  dependencies: Record<string, string>;
}

/**
 * Visual rendering order for section blocks on `index.astro`.
 *
 * Index = priority (lower renders first). Blocks whose category isn't listed
 * fall back to `CATEGORY_ORDER.length` (rendered last) and keep their
 * relative input order via a stable sort.
 *
 * This is the single source of truth for "in what order do sections appear."
 */
const CATEGORY_ORDER: ReadonlyArray<string> = [
  "header",
  "hero",
  "logo-cloud",
  "logos",
  "features",
  "how-it-works",
  "stats",
  "testimonials",
  "pricing",
  "about",
  "faq",
  "portfolio",
  "cta",
  "newsletter",
  "contact",
  "footer",
];

function categoryPriority(category: string): number {
  const idx = CATEGORY_ORDER.indexOf(category);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

/**
 * Pure function: takes the resolved config + loaded block sources and produces
 * the render plan. No I/O, no side effects.
 */
export function buildRenderPlan(
  config: ResolvedConfig,
  blocks: ReadonlyArray<BlockSource>,
  palette: PaletteCss,
): RenderPlan {
  // Stable sort by category priority. Section blocks only — layout/integration
  // blocks aren't rendered as sections on index.astro.
  const sectionBlocks = blocks
    .filter((b) => b.manifest.type === "section")
    .map((block, index) => ({ block, index }))
    .sort((a, b) => {
      const diff =
        categoryPriority(a.block.manifest.category) -
        categoryPriority(b.block.manifest.category);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(({ block }) => block);

  const contentEntries: Array<RenderPlan["contentEntries"][number]> = [];
  const isMultiLocale = config.locales.length > 1;

  for (const locale of config.locales) {
    for (const block of sectionBlocks) {
      if (!block.defaultContent) continue;
      const path = isMultiLocale
        ? `src/content/${locale}/sections/${block.manifest.name}.json`
        : `src/content/sections/${block.manifest.name}.json`;
      contentEntries.push({
        locale,
        blockName: block.manifest.name,
        path,
        data: block.defaultContent,
      });
    }
  }

  const dependencies = mergeDependencies(blocks);

  return {
    projectName: config.projectName,
    projectDir: config.projectDir,
    locale: config.defaultLocale,
    locales: config.locales,
    palette,
    layout: {
      title: config.projectName,
      description: `Generated with Fornix — ${config.projectName}`,
    },
    sectionBlocks,
    contentEntries,
    dependencies,
  };
}

function mergeDependencies(
  blocks: ReadonlyArray<BlockSource>,
): Record<string, string> {
  const merged: Record<string, string> = { astro: "^5.0.0" };
  for (const block of blocks) {
    for (const [name, version] of Object.entries(block.manifest.dependencies)) {
      const existing = merged[name];
      if (existing && existing !== version) {
        // Day 1: last-write-wins. A future pass should reconcile semver ranges.
        merged[name] = version;
      } else {
        merged[name] = version;
      }
    }
  }
  return merged;
}
