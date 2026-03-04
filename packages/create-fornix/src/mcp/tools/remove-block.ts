import type { BlockManifest } from "fornix-registry";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  readdirSync,
  rmdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { ok, err, isOk, type Result } from "../../utils/result.js";

// ── Input ───────────────────────────────────────────────────

export interface RemoveBlockInput {
  readonly name: string;
  readonly force?: boolean;
  readonly projectDirectory: string;
}

// ── Output ──────────────────────────────────────────────────

export interface RemoveBlockOutput {
  readonly removedBlock: string;
  readonly filesRemoved: number;
  readonly dependentsWarning: ReadonlyArray<string>;
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
  [key: string]: unknown;
}

// ── Implementation ──────────────────────────────────────────

export async function removeBlock(
  input: RemoveBlockInput,
): Promise<Result<RemoveBlockOutput, Error>> {
  const { name, force = false, projectDirectory } = input;

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

  // 1b. Fetch real registry
  const registryResult = await fetchRegistryIndex();
  if (!isOk(registryResult)) {
    return err(new Error(`Failed to fetch block registry: ${registryResult.error.message}`));
  }
  const manifests = registryResult.value.blocks;

  // 2. Check if block is installed
  const installedNames = new Set(manifest.blocks.map((block) => block.name));
  if (!installedNames.has(name)) {
    return err(new Error(`Block '${name}' is not installed.`));
  }

  // 3. Check for dependents
  const dependents = findDependents(name, installedNames, manifests);
  if (dependents.length > 0 && !force) {
    return err(
      new Error(
        `Block '${name}' is required by: ${dependents.join(", ")}. Use force to remove anyway.`,
      ),
    );
  }

  // 4. Get files to remove
  const blockManifest = manifests[name];
  const filesToRemove: string[] = [];

  if (blockManifest) {
    for (const file of blockManifest.files) {
      const filePath = join(projectDirectory, file.destination);
      if (existsSync(filePath)) {
        filesToRemove.push(filePath);
      }
    }
  }

  // 5. Remove files
  for (const filePath of filesToRemove) {
    unlinkSync(filePath);
    tryRemoveEmptyDirectory(dirname(filePath), projectDirectory);
  }

  // 6. Update fornix.json
  manifest.blocks = manifest.blocks.filter((block) => block.name !== name);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  return ok({
    removedBlock: name,
    filesRemoved: filesToRemove.length,
    dependentsWarning: dependents,
  });
}

// ── Helpers ─────────────────────────────────────────────────

function findDependents(
  blockName: string,
  installedNames: ReadonlySet<string>,
  manifests: Readonly<Record<string, BlockManifest>>
): ReadonlyArray<string> {
  const dependents: string[] = [];

  for (const installedName of installedNames) {
    const manifest = manifests[installedName];
    if (manifest && manifest.requires.includes(blockName)) {
      dependents.push(installedName);
    }
  }

  return dependents;
}

function tryRemoveEmptyDirectory(
  directoryPath: string,
  rootPath: string,
): void {
  if (directoryPath === rootPath || !directoryPath.startsWith(rootPath)) return;

  try {
    const entries = readdirSync(directoryPath);
    if (entries.length === 0) {
      rmdirSync(directoryPath);
      tryRemoveEmptyDirectory(dirname(directoryPath), rootPath);
    }
  } catch {
    // Ignore errors — directory may not exist or not be empty
  }
}
