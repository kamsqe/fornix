/**
 * Registry Index Builder
 *
 * Scans all block directories in fornix-blocks and palette files in
 * fornix-registry/palettes, validates each against its schema, and
 * produces a unified registry.json index.
 *
 * Usage:
 *   npx tsx scripts/build-registry.ts
 *
 * Output:
 *   packages/fornix-registry/registry.json
 */

import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BlockManifestSchema, PaletteSchema } from "../src/index.js";
import type { BlockManifest, Palette } from "../src/index.js";

// ── Paths ────────────────────────────────────────────────
// When run as a script (pnpm build:registry), cwd is fornix-registry root.
// When imported by tests, paths are passed explicitly to buildRegistry().

const REGISTRY_ROOT = process.cwd();
const BLOCKS_ROOT = resolve(REGISTRY_ROOT, "..", "fornix-blocks", "blocks");
const PALETTES_DIR = resolve(REGISTRY_ROOT, "palettes");
const OUTPUT_PATH = resolve(REGISTRY_ROOT, "registry.json");

// ── Types ────────────────────────────────────────────────

export interface RegistryIndex {
  readonly version: number;
  readonly generatedAt: string;
  readonly blocks: ReadonlyArray<BlockManifest>;
  readonly palettes: ReadonlyArray<Palette>;
}

export interface BuildResult {
  readonly registry: RegistryIndex;
  readonly errors: ReadonlyArray<string>;
}

// ── Build Logic ──────────────────────────────────────────

export function buildRegistry(
  blocksDir: string = BLOCKS_ROOT,
  palettesDir: string = PALETTES_DIR,
): BuildResult {
  const errors: string[] = [];
  const blocks: BlockManifest[] = [];
  const palettes: Palette[] = [];
  const blockNames = new Set<string>();
  const paletteNames = new Set<string>();

  // ── Scan blocks ──
  let blockDirs: string[] = [];
  try {
    blockDirs = readdirSync(blocksDir).filter((entry) => {
      const fullPath = join(blocksDir, entry);
      return statSync(fullPath).isDirectory();
    });
  } catch {
    errors.push(`Could not read blocks directory: ${blocksDir}`);
  }

  for (const dir of blockDirs) {
    const manifestPath = join(blocksDir, dir, "block.json");
    try {
      const raw = readFileSync(manifestPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const result = BlockManifestSchema.safeParse(parsed);

      if (result.success) {
        if (blockNames.has(result.data.name)) {
          errors.push(`Duplicate block name: ${result.data.name}`);
        } else {
          blockNames.add(result.data.name);
          blocks.push(result.data);
        }
      } else {
        const issues = result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        errors.push(`Invalid manifest in ${dir}/block.json: ${issues}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to read ${dir}/block.json: ${msg}`);
    }
  }

  // ── Scan palettes ──
  let paletteFiles: string[] = [];
  try {
    paletteFiles = readdirSync(palettesDir).filter((f) => f.endsWith(".json"));
  } catch {
    errors.push(`Could not read palettes directory: ${palettesDir}`);
  }

  for (const file of paletteFiles) {
    const filePath = join(palettesDir, file);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const result = PaletteSchema.safeParse(parsed);

      if (result.success) {
        if (paletteNames.has(result.data.name)) {
          errors.push(`Duplicate palette name: ${result.data.name}`);
        } else {
          paletteNames.add(result.data.name);
          palettes.push(result.data);
        }
      } else {
        const issues = result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(", ");
        errors.push(`Invalid palette in ${file}: ${issues}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to read palette ${file}: ${msg}`);
    }
  }

  // Sort alphabetically for deterministic output
  blocks.sort((a, b) => a.name.localeCompare(b.name));
  palettes.sort((a, b) => a.name.localeCompare(b.name));

  const registry: RegistryIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    blocks,
    palettes,
  };

  return { registry, errors };
}

// ── CLI Entry Point ──────────────────────────────────────

function main(): void {
  try {
    console.log("Building registry index...\n");

    const { registry, errors } = buildRegistry();

    if (errors.length > 0) {
      console.error("Errors:");
      for (const error of errors) {
        console.error(`  ✗ ${error}`);
      }
      console.error();
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2) + "\n");

    console.log(`✓ ${registry.blocks.length} blocks indexed`);
    console.log(`✓ ${registry.palettes.length} palettes indexed`);
    console.log(`✓ Written to ${OUTPUT_PATH}`);

    if (errors.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (error: unknown) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run when executed directly
// When imported by vitest, only buildRegistry() is used
const isTest = process.env["VITEST"] === "true" ||
  (process.argv[1] && process.argv[1].includes("vitest"));

if (!isTest) {
  main();
}
