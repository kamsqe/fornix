import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

/**
 * Source locations for blocks and palettes — resolved at runtime.
 *
 * Two modes:
 *   1. Published CLI: blocks and palettes are bundled under `dist/blocks/`
 *      and `dist/palettes/` by tsup's onSuccess copy step. The running
 *      module lives at `dist/cli.js` (or `dist/index.js`), so they sit
 *      next to it.
 *   2. Dev (running from `src/...` under the monorepo): walks up to find
 *      `pnpm-workspace.yaml`, then reads from the workspace packages.
 *
 * `bundledPath()` checks #1 first and falls back to #2 if the bundled
 * directory isn't present.
 */
const HERE = dirname(fileURLToPath(import.meta.url));

function workspaceRootOrNull(): string | null {
  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Path to a block's directory (e.g. `blocks("hero-gradient")`).
 * Prefers bundled `dist/blocks/<name>`, falls back to workspace.
 */
export function blockPath(blockName: string): string {
  const bundled = resolve(HERE, "blocks", blockName);
  if (existsSync(bundled)) return bundled;
  return workspacePath("packages", "fornix-blocks", "blocks", blockName);
}

/**
 * Path to a palette JSON (e.g. `palettePath("midnight")`).
 * Prefers bundled `dist/palettes/<name>.json`, falls back to workspace.
 */
export function palettePath(paletteName: string): string {
  const bundled = resolve(HERE, "palettes", `${paletteName}.json`);
  if (existsSync(bundled)) return bundled;
  return workspacePath(
    "packages",
    "fornix-registry",
    "palettes",
    `${paletteName}.json`,
  );
}

/**
 * Workspace-rooted path. Throws when not running inside the monorepo —
 * callers should prefer `blockPath()` / `palettePath()` which fall back
 * to bundled assets when published.
 */
export function workspacePath(...segments: string[]): string {
  const root = workspaceRootOrNull();
  if (!root) {
    throw new Error(
      `Could not locate pnpm-workspace.yaml from ${HERE}. ` +
        `If this is the published CLI, the bundled assets under dist/ should ` +
        `have been used instead.`,
    );
  }
  return resolve(root, ...segments);
}

export function findWorkspaceRoot(): string {
  const root = workspaceRootOrNull();
  if (!root) {
    throw new Error("Could not locate pnpm-workspace.yaml — workspace root not found");
  }
  return root;
}
