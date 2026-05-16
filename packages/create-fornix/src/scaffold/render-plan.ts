import type { BlockManifest } from "fornix-registry";

import type { ResolvedConfig } from "../schemas/config.js";
import type { SiteConfig } from "../schemas/site-config.js";
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

  /**
   * Site-wide configuration object emitted to `src/site.config.ts` and read
   * by every block. The single source of truth for brand, nav, CTAs, social,
   * legal, and archetype-specific extension data.
   */
  siteConfig: SiteConfig;

  /** Where the generated project will deploy. Drives wrangler.json emission. */
  deployTarget: "cloudflare" | "vercel" | "netlify" | "static";

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
 * Per-locale content overrides — typically produced by the AI provider and
 * keyed `[locale][blockName] = content`. Falls back to `block.defaultContent`
 * when a (locale, block) combination isn't present.
 */
export type ContentByLocale = Record<string, Record<string, Record<string, unknown>>>;

/**
 * Pure function: takes the resolved config + loaded block sources and produces
 * the render plan. No I/O, no side effects.
 */
export function buildRenderPlan(
  config: ResolvedConfig,
  blocks: ReadonlyArray<BlockSource>,
  palette: PaletteCss,
  contentByLocale: ContentByLocale = {},
  siteConfig?: SiteConfig,
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

  // Convention: content always lives under `sections/{locale}/{block}.json`,
  // even for single-locale projects. The block .astro reads the locale via
  // `Astro.currentLocale` and constructs the entry ID as `{locale}/{block}`.
  // This eliminates a whole class of "content not found" bugs by treating
  // single-locale as just multi-locale with N=1.
  //
  // For each (locale, block), prefer the AI-supplied per-locale content from
  // `contentByLocale`, then the block's `defaultContent`, then skip.
  for (const locale of config.locales) {
    for (const block of sectionBlocks) {
      const override = contentByLocale[locale]?.[block.manifest.name];
      const data = override ?? block.defaultContent;
      if (!data) continue;
      contentEntries.push({
        locale,
        blockName: block.manifest.name,
        path: `src/content/sections/${locale}/${block.manifest.name}.json`,
        data,
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
    siteConfig: siteConfig ?? defaultSiteConfig(config),
    deployTarget: config.deployTarget,
    layout: {
      title: config.projectName,
      description: `Generated with Fornix — ${config.projectName}`,
    },
    sectionBlocks,
    contentEntries,
    dependencies,
  };
}

/**
 * Reasonable site-config defaults derived from `ResolvedConfig`. Archetype
 * authors will override these in week 3; for now this gives every scaffold
 * a populated `src/site.config.ts` consistent with the rest of the project.
 */
function defaultSiteConfig(config: ResolvedConfig): SiteConfig {
  const displayName = humanizeProjectName(config.projectName);
  const initials = monogramFrom(displayName);
  return {
    name: displayName,
    archetype: config.createdWith === "ai" ? "ai-generated" : undefined,
    locale: {
      default: config.defaultLocale,
      supported: [...config.locales],
    },
    logo: { type: "monogram", text: initials },
    legal: {
      copyright: `© ${new Date().getUTCFullYear()} ${displayName}`,
    },
  };
}

function humanizeProjectName(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || slug;
}

function monogramFrom(name: string): string {
  const words = name
    .split(/[\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase());
  if (words.length === 0) return "F";
  if (words.length === 1) return words[0];
  return (words[0] + words[1]).slice(0, 2);
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
