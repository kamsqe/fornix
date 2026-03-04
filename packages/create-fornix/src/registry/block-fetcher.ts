/**
 * Block Fetcher — downloads block directories from a GitHub registry repo.
 *
 * Uses giget to fetch individual block directories from the fornix-blocks
 * GitHub repo. Caches blocks locally in ~/.cache/fornix/blocks/ for offline use.
 *
 * Architecture:
 *   1. Check local cache first
 *   2. If cache miss → download from GitHub via giget
 *   3. If offline + cache miss → return error (never crash)
 */

import { downloadTemplate } from "giget";
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { BlockManifestSchema } from "fornix-registry";
import type { BlockManifest } from "fornix-registry";
import { ok, err, type Result } from "../utils/result.js";
import { FIXTURE_MANIFESTS, FIXTURE_BLOCK_SOURCES } from "../cli/fixture-registry.js";

// ── Config ───────────────────────────────────────────────

export interface FetcherConfig {
  /** GitHub repo in format "owner/repo" */
  readonly repo: string;
  /** Branch or tag to fetch from */
  readonly ref: string;
  /** Local cache directory */
  readonly cacheDir: string;
  /** Path prefix within the repo where blocks live */
  readonly blocksPrefix: string;
  /** Force re-download even if cached */
  readonly force: boolean;
  /** Max cache age in ms (default: 24h) */
  readonly maxCacheAge: number;
}

const DEFAULT_CONFIG: FetcherConfig = {
  repo: "kamsqe/fornix",
  ref: "main",
  cacheDir: join(homedir(), ".cache", "fornix", "blocks"),
  blocksPrefix: "packages/fornix-blocks/blocks",
  force: process.env.FORNIX_NO_CACHE === "true",
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
};

// ── Output Types ─────────────────────────────────────────

export interface FetchedBlock {
  readonly manifest: BlockManifest;
  readonly files: Record<string, string>;
  readonly fromCache: boolean;
}

export interface FetchError {
  readonly kind: "FetchError";
  readonly blockName: string;
  readonly message: string;
}

// ── Public API ───────────────────────────────────────────

/**
 * Fetch a single block by name from the GitHub registry.
 *
 * 1. Checks local cache (~/.cache/fornix/blocks/<name>/)
 * 2. If cache miss or expired → downloads via giget
 * 3. If offline + cache miss → returns FetchError
 */
export async function fetchBlock(
  blockName: string,
  config: Partial<FetcherConfig> = {},
): Promise<Result<FetchedBlock, FetchError>> {
  if (process.env.FORNIX_E2E_MOCK === "true") {
    const manifest = FIXTURE_MANIFESTS[blockName];
    const files = FIXTURE_BLOCK_SOURCES[blockName];
    if (!manifest || !files) {
      return err({
        kind: "FetchError" as const,
        blockName,
        message: `Mock block not found: ${blockName}`,
      });
    }
    return ok({ manifest, files, fromCache: true });
  }

  const cfg: FetcherConfig = { ...DEFAULT_CONFIG, ...config };

  const blockCacheDir = join(cfg.cacheDir, blockName);

  // 1. Check cache
  if (!cfg.force && isCacheValid(blockCacheDir, cfg.maxCacheAge)) {
    return loadFromCache(blockName, blockCacheDir);
  }

  // 2. Download from GitHub
  try {
    const source = `gh:${cfg.repo}/${cfg.blocksPrefix}/${blockName}#${cfg.ref}`;

    // Ensure parent cache dir exists
    mkdirSync(cfg.cacheDir, { recursive: true });

    await downloadTemplate(source, {
      dir: blockCacheDir,
      force: true, // overwrite cache
    });

    return loadFromCache(blockName, blockCacheDir);
  } catch (error: unknown) {
    // 3. Offline fallback — try stale cache
    if (existsSync(join(blockCacheDir, "block.json"))) {
      return loadFromCache(blockName, blockCacheDir);
    }

    const message =
      error instanceof Error ? error.message : String(error);
    return err({
      kind: "FetchError" as const,
      blockName,
      message: `Failed to fetch block '${blockName}': ${message}`,
    });
  }
}

/**
 * Fetch multiple blocks. Returns all results (some may be errors).
 */
export async function fetchBlocks(
  blockNames: ReadonlyArray<string>,
  config: Partial<FetcherConfig> = {},
): Promise<ReadonlyArray<Result<FetchedBlock, FetchError>>> {
  return Promise.all(blockNames.map((name) => fetchBlock(name, config)));
}

// ── Cache Helpers ────────────────────────────────────────

function isCacheValid(blockCacheDir: string, maxAge: number): boolean {
  const manifestPath = join(blockCacheDir, "block.json");
  if (!existsSync(manifestPath)) {
    return false;
  }

  try {
    const stat = statSync(manifestPath);
    const age = Date.now() - stat.mtimeMs;
    return age < maxAge;
  } catch {
    return false;
  }
}

function loadFromCache(
  blockName: string,
  blockCacheDir: string,
): Result<FetchedBlock, FetchError> {
  try {
    const manifestPath = join(blockCacheDir, "block.json");

    if (!existsSync(manifestPath)) {
      return err({
        kind: "FetchError" as const,
        blockName,
        message: `Cache miss: no block.json found in ${blockCacheDir}`,
      });
    }

    const raw = readFileSync(manifestPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    const result = BlockManifestSchema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return err({
        kind: "FetchError" as const,
        blockName,
        message: `Invalid manifest in cache: ${issues}`,
      });
    }

    // Read all block source files
    const files: Record<string, string> = {};
    const entries = readdirSync(blockCacheDir);

    for (const entry of entries) {
      const fullPath = join(blockCacheDir, entry);
      if (statSync(fullPath).isFile() && entry !== "block.json") {
        files[entry] = readFileSync(fullPath, "utf-8");
      }
    }

    return ok({
      manifest: result.data,
      files,
      fromCache: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    return err({
      kind: "FetchError" as const,
      blockName,
      message: `Failed to load block from cache: ${message}`,
    });
  }
}
