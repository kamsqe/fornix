import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  BlockManifestSchema,
  type BlockManifest,
} from "fornix-registry";

import { ok, err, type Result } from "../utils/result.js";
import type { BlockNotFoundError, SchemaValidationError } from "../errors.js";
import { blockPath } from "./workspace.js";

export interface BlockSource {
  manifest: BlockManifest;
  /**
   * Map from in-block source path (relative to the block's directory)
   * to the file's UTF-8 contents.
   */
  files: Record<string, string>;
  /**
   * Default content for this block's section entry, if a `default-content.json`
   * was present. Always an object; never an array.
   */
  defaultContent: Record<string, unknown> | null;
}

export function loadBlock(
  blockName: string,
): Result<BlockSource, BlockNotFoundError | SchemaValidationError> {
  const blockDir = blockPath(blockName);

  let manifestRaw: string;
  try {
    manifestRaw = readFileSync(join(blockDir, "block.json"), "utf8");
  } catch {
    return err({
      kind: "BlockNotFoundError",
      message: `Block "${blockName}" not found at ${blockDir}`,
      blockName,
    });
  }

  const parsed = BlockManifestSchema.safeParse(JSON.parse(manifestRaw));
  if (!parsed.success) {
    return err({
      kind: "SchemaValidationError",
      message: `Block "${blockName}" manifest is invalid: ${parsed.error.message}`,
      path: parsed.error.issues[0]?.path.map(String) ?? [],
    });
  }

  const files: Record<string, string> = {};
  for (const filePath of walkFiles(blockDir)) {
    const rel = relative(blockDir, filePath);
    if (rel === "block.json" || rel === "default-content.json") continue;
    files[rel] = readFileSync(filePath, "utf8");
  }

  let defaultContent: Record<string, unknown> | null = null;
  try {
    const raw = readFileSync(join(blockDir, "default-content.json"), "utf8");
    const json = JSON.parse(raw);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      defaultContent = json as Record<string, unknown>;
    }
  } catch {
    // optional — not every block ships default content
  }

  return ok({ manifest: parsed.data, files, defaultContent });
}

function* walkFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walkFiles(full);
    } else if (stat.isFile()) {
      yield full;
    }
  }
}
