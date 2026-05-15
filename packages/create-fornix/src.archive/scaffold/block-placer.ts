import type { BlockManifest } from "fornix-registry";
import type { ResolvedConfig } from "../schemas/config.js";
import type { FileMap } from "./structure-generator.js";
import { ok, err, type Result } from "../utils/result.js";

// ── Types ────────────────────────────────────────────────

/**
 * Block source content: maps block name → (source filename → file content).
 */
export type BlockSourceMap = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

// ── Condition Context ────────────────────────────────────

interface ConditionContext {
  readonly renderMode: string;
  readonly deployTarget: string;
  readonly cssEngine: string;
  readonly database: string;
}

// ── Public API ───────────────────────────────────────────

/**
 * Places block files into the correct project locations.
 * Reads each block's `files` array and maps source → destination,
 * evaluating `condition` fields against the resolved config.
 */
export function placeBlocks(
  blocks: ReadonlyArray<BlockManifest>,
  blockSources: BlockSourceMap,
  config: ResolvedConfig,
): Result<FileMap, Error> {
  const files: FileMap = {};
  const context: ConditionContext = {
    renderMode: config.renderMode,
    deployTarget: config.deployTarget,
    cssEngine: config.cssEngine,
    database: config.database,
  };

  for (const block of blocks) {
    const sources = blockSources[block.name];
    if (!sources) {
      return err(
        new Error(
          `Block source content not found for '${block.name}'`,
        ),
      );
    }

    for (const file of block.files) {
      if (file.condition && !evaluateCondition(file.condition, context)) {
        continue;
      }

      const content = sources[file.source];
      if (content === undefined) {
        return err(
          new Error(
            `Source file '${file.source}' not found in block '${block.name}'`,
          ),
        );
      }

      files[file.destination] = content;
    }
  }

  return ok(files);
}

// ── Condition Evaluator ──────────────────────────────────

/**
 * Evaluates a simple condition string against the config context.
 * Supports patterns like:
 *   - `renderMode !== 'static'`
 *   - `renderMode === 'server'`
 *   - `deployTarget === 'cloudflare'`
 *   - `cssEngine !== 'vanilla'`
 */
function evaluateCondition(
  condition: string,
  context: ConditionContext,
): boolean {
  const notEqualsMatch = condition.match(
    /^(\w+)\s*!==\s*'([^']*)'$/,
  );
  if (notEqualsMatch) {
    const [, field, value] = notEqualsMatch;
    const contextValue = getContextValue(field as string, context);
    return contextValue !== value;
  }

  const equalsMatch = condition.match(
    /^(\w+)\s*===\s*'([^']*)'$/,
  );
  if (equalsMatch) {
    const [, field, value] = equalsMatch;
    const contextValue = getContextValue(field as string, context);
    return contextValue === value;
  }

  return true;
}

function getContextValue(
  field: string,
  context: ConditionContext,
): string | undefined {
  if (field in context) {
    return context[field as keyof ConditionContext];
  }
  return undefined;
}
