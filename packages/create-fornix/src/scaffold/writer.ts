import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { FileMap } from "./pipeline.js";

/**
 * The single I/O sink of the scaffold pipeline.
 * Writes a `FileMap` (path → contents) to disk under `projectDir`.
 */
export function writeFiles(projectDir: string, files: FileMap): void {
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(projectDir, relPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf8");
  }
}
