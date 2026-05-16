import type { ResolvedConfig } from "../schemas/config.js";
import { ok, type Result } from "../utils/result.js";
import type { FornixError } from "../errors.js";

import type {
  AIProvider,
  BrandContext,
} from "../ai/provider.js";
import {
  generateCopyForBlocks,
  type GeneratedCopyEntry,
} from "../ai/generate-copy.js";

import { loadBlock, type BlockSource } from "./blocks.js";
import {
  loadPalette,
  renderPaletteCssFromColors,
  type PaletteCss,
} from "./palette.js";
import { buildRenderPlan, type ContentByLocale } from "./render-plan.js";
import { renderToFiles, type FileMap } from "./pipeline.js";
import { writeFiles } from "./writer.js";
import type { SiteConfig } from "../schemas/site-config.js";

export interface ScaffoldResult {
  projectDir: string;
  files: FileMap;
  /**
   * Per-block, per-locale provenance trace. Always present even when no AI
   * provider was supplied — entries report `source: "default"` in that case.
   */
  copyTrace: ReadonlyArray<GeneratedCopyEntry>;
}

export interface ScaffoldOptions {
  /**
   * Optional AI provider for generating block content. When omitted (or when
   * a request fails) the scaffolder uses each block's `default-content.json`.
   */
  provider?: AIProvider;
  brand?: BrandContext;
  /**
   * Per-(locale, block) content overrides supplied by the archetype layer
   * (or any other pre-scaffold source). Layered UNDER any AI-generated
   * content for the same key — AI wins on conflict.
   */
  archetypeContent?: ContentByLocale;
  /**
   * Site-config overrides supplied by the archetype layer. Merged on top of
   * the auto-derived defaults (humanized projectName, monogram, copyright)
   * before site.config.ts is written.
   */
  siteConfigOverrides?: Partial<SiteConfig>;
  /**
   * Fires once per (block × locale) AI call when that call resolves
   * (success OR fallback). The CLI uses this to print a progress tick.
   * No-op when no provider is in use.
   */
  onAiTick?: (event: {
    entry: GeneratedCopyEntry;
    index: number;
    total: number;
  }) => void;
}

/**
 * Top-level entry point. Pure-ish orchestration:
 *   1. Load block sources (I/O — reads workspace)
 *   2. Load palette (I/O — reads workspace; falls back to inline colors)
 *   3. Build render plan (pure)
 *   4. Project to file map (pure)
 *   5. Write to disk (I/O — single sink)
 *
 * All five steps return a `Result`; the function short-circuits on the first
 * failure and never throws.
 */
export async function scaffoldProject(
  config: ResolvedConfig,
  options: ScaffoldOptions = {},
): Promise<Result<ScaffoldResult, FornixError>> {
  // 1. Blocks — collect the union of every block referenced by `config.blocks`
  //    AND every block referenced by `config.pages[*].blocks`. Same block on
  //    multiple pages is loaded once (deduped by name).
  const blockNames = new Set<string>(config.blocks.map((b) => b.name));
  if (config.pages) {
    for (const page of config.pages) {
      for (const sel of page.blocks) blockNames.add(sel.name);
    }
  }
  const blocks: BlockSource[] = [];
  for (const name of blockNames) {
    const result = loadBlock(name);
    if (!result.ok) return result;
    blocks.push(result.value);
  }

  // 2. Palette — preset first, then fall back to inline colors
  let palette: PaletteCss;
  if (config.palette.preset) {
    const result = loadPalette(config.palette.preset);
    if (!result.ok) return result;
    palette = result.value;
  } else {
    palette = {
      name: "custom",
      mode: "dark",
      css: renderPaletteCssFromColors(config.palette.colors, "dark"),
    };
  }

  // 3. Generate copy (AI provider if given; defaults otherwise)
  const copyTrace = options.provider && options.brand
    ? await generateCopyForBlocks({
        provider: options.provider,
        blocks,
        brand: options.brand,
        locales: config.locales,
        onTick: options.onAiTick,
      })
    : defaultCopyTrace(blocks, config.locales);

  // Group the trace by (locale, blockName) so the render plan can pick the
  // right content per page. Layering order (lowest → highest precedence):
  //   1. block defaultContent (baseline)
  //   2. archetypeContent (set by the archetype loader if --archetype was used)
  //   3. AI-generated content (from this scaffold's provider call)
  // The render plan reads `contentByLocale` and falls back to defaultContent
  // when a key is absent. We seed it with archetype data, then AI overrides.
  const contentByLocale: ContentByLocale = {};
  // Layer 2: archetype content (if any) — base for the locale map.
  if (options.archetypeContent) {
    for (const [locale, blockMap] of Object.entries(options.archetypeContent)) {
      contentByLocale[locale] = { ...blockMap };
    }
  }
  // Layer 3: AI-generated content — overrides on top.
  for (const entry of copyTrace) {
    if (entry.source === "default") continue;
    if (!contentByLocale[entry.locale]) contentByLocale[entry.locale] = {};
    contentByLocale[entry.locale][entry.blockName] = entry.content;
  }

  // 4. Plan — pass the archetype's site-config overrides through so the
  // render plan merges them with auto-derived defaults.
  const baseSiteConfig =
    options.siteConfigOverrides &&
    Object.keys(options.siteConfigOverrides).length > 0
      ? mergeSiteConfig(config, options.siteConfigOverrides)
      : undefined;
  const plan = buildRenderPlan(
    config,
    blocks,
    palette,
    contentByLocale,
    baseSiteConfig,
  );

  // 5. Project
  const files = renderToFiles(plan);

  // 6. Write
  writeFiles(config.projectDir, files);

  return ok({
    projectDir: config.projectDir,
    files,
    copyTrace,
  });
}

/**
 * Build a `SiteConfig` by layering the archetype overrides on top of the
 * auto-derived defaults (humanized projectName, monogram from initials,
 * copyright with current year, locale from config). The render plan calls
 * its own `defaultSiteConfig(config)` when no override is passed; this
 * function reproduces those defaults and merges the archetype's keys.
 *
 * Keeping this here (vs in render-plan) means the render plan stays
 * archetype-agnostic — it just takes a `SiteConfig` and emits it.
 */
function mergeSiteConfig(
  config: ResolvedConfig,
  overrides: Partial<SiteConfig>,
): SiteConfig {
  const displayName = humanizeProjectName(config.projectName);
  const initials = monogramFrom(displayName);
  const baseline: SiteConfig = {
    name: displayName,
    locale: {
      default: config.defaultLocale,
      supported: [...config.locales],
    },
    logo: { type: "monogram", text: initials },
    legal: {
      copyright: `© ${new Date().getUTCFullYear()} ${displayName}`,
    },
  };
  return {
    ...baseline,
    ...overrides,
    // Sub-objects need shallow merges so archetype can override a single
    // field without dropping the whole baseline.
    locale: { ...baseline.locale, ...(overrides.locale ?? {}) },
    logo: overrides.logo
      ? { ...(baseline.logo ?? { type: "monogram" }), ...overrides.logo }
      : baseline.logo,
    legal: { ...baseline.legal, ...(overrides.legal ?? {}) },
  };
}

function humanizeProjectName(slug: string): string {
  return (
    slug
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || slug
  );
}

function monogramFrom(name: string): string {
  const words = name.split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase());
  if (words.length === 0) return "F";
  if (words.length === 1) return words[0];
  return (words[0] + words[1]).slice(0, 2);
}

function defaultCopyTrace(
  blocks: ReadonlyArray<BlockSource>,
  locales: ReadonlyArray<string>,
): GeneratedCopyEntry[] {
  const out: GeneratedCopyEntry[] = [];
  for (const locale of locales) {
    for (const block of blocks) {
      out.push({
        blockName: block.manifest.name,
        locale,
        content: block.defaultContent ?? {},
        source: "default",
      });
    }
  }
  return out;
}

