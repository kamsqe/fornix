import type { ResolvedConfig } from "../schemas/config.js";
import { ok, err, type Result } from "../utils/result.js";
import type { FornixError } from "../errors.js";

import { loadBlock, type BlockSource } from "./blocks.js";
import { loadPalette, renderPaletteCssFromColors, type PaletteCss } from "./palette.js";
import { buildRenderPlan } from "./render-plan.js";
import { renderToFiles, type FileMap } from "./pipeline.js";
import { writeFiles } from "./writer.js";

export interface ScaffoldResult {
  projectDir: string;
  files: FileMap;
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
): Promise<Result<ScaffoldResult, FornixError>> {
  // 1. Blocks
  const blocks: BlockSource[] = [];
  for (const selection of config.blocks) {
    const result = loadBlock(selection.name);
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

  // 3. Plan
  const plan = buildRenderPlan(config, blocks, palette);

  // 4. Project
  const files = renderToFiles(plan);

  // 5. Write
  writeFiles(config.projectDir, files);

  return ok({ projectDir: config.projectDir, files });
}
