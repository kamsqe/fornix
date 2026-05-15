import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

/**
 * Resolve the monorepo root by walking up from this file's location
 * until we find a `pnpm-workspace.yaml`.
 *
 * Day-1 spine reads blocks and palettes directly from the workspace.
 * A future iteration will swap this out for a bundled / fetched source.
 */
export function findWorkspaceRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not locate pnpm-workspace.yaml — workspace root not found");
}

export function workspacePath(...segments: string[]): string {
  return resolve(findWorkspaceRoot(), ...segments);
}
