import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { BUILTIN_PALETTES, type BlockManifest, type Palette } from "fornix-registry";
import { ok, err, type Result } from "../utils/result.js";
import { FIXTURE_MANIFESTS } from "../cli/fixture-registry.js";

// ── Types ────────────────────────────────────────────────

export interface RegistryIndex {
  readonly blocks: Readonly<Record<string, BlockManifest>>;
  readonly palettes: ReadonlyArray<Palette>;
}

export interface RegistryFetchError {
  readonly kind: "RegistryFetchError";
  readonly message: string;
}

export interface RegistryConfig {
  /** URL for the raw registry.json file */
  readonly registryUrl: string;
  /** Local cache directory */
  readonly cacheDir: string;
  /** Force re-download even if cached */
  readonly force: boolean;
  /** Max cache age in ms (default: 24h) */
  readonly maxCacheAge: number;
}

const DEFAULT_CONFIG: RegistryConfig = {
  registryUrl: process.env.FORNIX_REGISTRY_URL || "https://raw.githubusercontent.com/kamsqe/fornix/main/packages/fornix-registry/registry.json",
  cacheDir: join(homedir(), ".cache", "fornix"),
  force: process.env.FORNIX_NO_CACHE === "true",
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
};

// ── Public API ───────────────────────────────────────────

/**
 * Fetch the overall registry.json index.
 * Maps block names to their manifest definition.
 * 
 * 1. Checks local cache (~/.cache/fornix/registry.json)
 * 2. If miss or expired → downloads from GitHub
 * 3. Falls back to stale cache if offline
 */
export async function fetchRegistryIndex(
  config: Partial<RegistryConfig> = {},
): Promise<Result<RegistryIndex, RegistryFetchError>> {
  if (process.env.FORNIX_E2E_MOCK === "true") {
    return ok({ blocks: FIXTURE_MANIFESTS, palettes: BUILTIN_PALETTES });
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cacheFile = join(cfg.cacheDir, "registry.json");

  // Helper to map raw registry shape to our expected RegistryIndex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapDataToIndex = (data: any): RegistryIndex => {
    const blocksArray = Array.isArray(data.blocks) ? data.blocks : [];
    const blocksRecord: Record<string, BlockManifest> = {};
    for (const block of blocksArray) {
      if (block.name) {
        blocksRecord[block.name] = block;
      }
    }
    return {
      blocks: blocksRecord,
      palettes: Array.isArray(data.palettes) ? data.palettes : [],
    };
  };

  // 1. Check cache
  if (!cfg.force && isCacheValid(cacheFile, cfg.maxCacheAge)) {
    const cached = loadFromCache(cacheFile);
    if (cached) return ok(mapDataToIndex(cached));
  }

  // 2. Download from GitHub
  try {
    const response = await fetch(cfg.registryUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Save to cache
    mkdirSync(cfg.cacheDir, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(data, null, 2));

    return ok(mapDataToIndex(data));
  } catch (error) {
    // 3. Offline fallback
    const cached = loadFromCache(cacheFile);
    if (cached) {
      return ok(mapDataToIndex(cached));
    }

    const message = error instanceof Error ? error.message : String(error);
    return err({
      kind: "RegistryFetchError",
      message: `Failed to fetch registry from ${cfg.registryUrl}: ${message}`,
    });
  }
}

// ── Cache Helpers ────────────────────────────────────────

function isCacheValid(cachePath: string, maxAge: number): boolean {
  if (!existsSync(cachePath)) {
    return false;
  }

  try {
    const stat = statSync(cachePath);
    const age = Date.now() - stat.mtimeMs;
    return age < maxAge;
  } catch {
    return false;
  }
}

function loadFromCache(cachePath: string): RegistryIndex | null {
  try {
    if (!existsSync(cachePath)) return null;
    const raw = readFileSync(cachePath, "utf-8");
    return JSON.parse(raw) as RegistryIndex;
  } catch {
    return null;
  }
}
