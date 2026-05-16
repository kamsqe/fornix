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
      })
    : defaultCopyTrace(blocks, config.locales);

  // Group the trace by (locale, blockName) so the render plan can pick the
  // right content per page. AI-generated copy lives in `contentByLocale`;
  // any block-locale combination missing falls back to `block.defaultContent`.
  const contentByLocale: ContentByLocale = {};
  for (const entry of copyTrace) {
    if (entry.source === "default") continue;
    if (!contentByLocale[entry.locale]) contentByLocale[entry.locale] = {};
    contentByLocale[entry.locale][entry.blockName] = entry.content;
  }

  // 4. Plan
  const plan = buildRenderPlan(config, blocks, palette, contentByLocale);

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

