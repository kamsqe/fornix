import type { BlockManifest } from "fornix-registry";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  FIXTURE_MANIFESTS,
  FIXTURE_BLOCK_SOURCES,
} from "../../cli/fixture-registry.js";
import { ok, err, type Result } from "../../utils/result.js";

// ── Input ───────────────────────────────────────────────────

export interface AddBlockInput {
  readonly name: string;
  readonly variant?: string;
  readonly projectDirectory: string;
}

// ── Output ──────────────────────────────────────────────────

export interface AddBlockOutput {
  readonly addedBlocks: ReadonlyArray<string>;
  readonly filesCreated: number;
}

// ── Manifest Shape ──────────────────────────────────────────

interface FornixManifest {
  version: string;
  blocks: Array<{
    name: string;
    version: string;
    variant: string;
    installedAt: string;
  }>;
  renderMode: string;
  [key: string]: unknown;
}

// ── Implementation ──────────────────────────────────────────

export function addBlock(
  input: AddBlockInput,
): Result<AddBlockOutput, Error> {
  const { name, variant = "default", projectDirectory } = input;

  // 1. Read fornix.json
  const manifestPath = join(projectDirectory, "fornix.json");
  if (!existsSync(manifestPath)) {
    return err(
      new Error("No fornix.json found. Not a Fornix project directory."),
    );
  }

  let manifest: FornixManifest;
  try {
    const raw = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(raw) as FornixManifest;
  } catch {
    return err(new Error("Failed to parse fornix.json."));
  }

  // 2. Look up block
  const blockManifest = FIXTURE_MANIFESTS[name];
  if (!blockManifest) {
    return err(
      new Error(
        `Block '${name}' not found in registry. Available: ${Object.keys(FIXTURE_MANIFESTS).join(", ")}`,
      ),
    );
  }

  // 3. Check if already installed
  const installedNames = new Set(manifest.blocks.map((block) => block.name));
  if (installedNames.has(name)) {
    return ok({ addedBlocks: [], filesCreated: 0 });
  }

  // 4. Resolve dependencies
  const blocksToAdd = resolveDependencies(name, installedNames);

  // 5. Check mode compatibility
  for (const blockName of blocksToAdd) {
    const dependencyManifest = FIXTURE_MANIFESTS[blockName];
    if (
      dependencyManifest?.requiredMode &&
      manifest.renderMode !== dependencyManifest.requiredMode
    ) {
      return err(
        new Error(
          `Block '${blockName}' requires '${dependencyManifest.requiredMode}' mode, but project uses '${manifest.renderMode}'.`,
        ),
      );
    }
  }

  // 6. Place files
  let filesCreated = 0;
  for (const blockName of blocksToAdd) {
    const blockDef = FIXTURE_MANIFESTS[blockName];
    const sources = FIXTURE_BLOCK_SOURCES[blockName];
    if (!blockDef || !sources) {
      return err(
        new Error(`Source files not found for block '${blockName}'.`),
      );
    }

    for (const file of blockDef.files) {
      const content = sources[file.source];
      if (content === undefined) {
        return err(
          new Error(
            `Source file '${file.source}' not found for block '${blockName}'.`,
          ),
        );
      }

      const filePath = join(projectDirectory, file.destination);
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, content);
      filesCreated++;
    }
  }

  // 7. Update fornix.json
  const now = new Date().toISOString();
  for (const blockName of blocksToAdd) {
    const blockDef = FIXTURE_MANIFESTS[blockName];
    if (!blockDef) continue;
    manifest.blocks.push({
      name: blockName,
      version: blockDef.version,
      variant: blockName === name ? variant : "default",
      installedAt: now,
    });
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  return ok({ addedBlocks: blocksToAdd, filesCreated });
}

// ── Dependency Resolution ───────────────────────────────────

function resolveDependencies(
  blockName: string,
  installedNames: ReadonlySet<string>,
): ReadonlyArray<string> {
  const result: string[] = [];
  const visited = new Set<string>();

  function walk(currentName: string): void {
    if (visited.has(currentName) || installedNames.has(currentName)) return;
    visited.add(currentName);

    const manifest = FIXTURE_MANIFESTS[currentName];
    if (!manifest) return;

    for (const dependency of manifest.requires) {
      walk(dependency);
    }

    result.push(currentName);
  }

  walk(blockName);
  return result;
}
