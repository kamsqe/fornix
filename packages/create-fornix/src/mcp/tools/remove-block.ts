import {
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  readdirSync,
  rmdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { FIXTURE_MANIFESTS } from "../../cli/fixture-registry.js";
import { ok, err, type Result } from "../../utils/result.js";

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

export function removeBlock(
  input: RemoveBlockInput,
): Result<RemoveBlockOutput, Error> {
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

  // 2. Check if block is installed
  const installedNames = new Set(manifest.blocks.map((block) => block.name));
  if (!installedNames.has(name)) {
    return err(new Error(`Block '${name}' is not installed.`));
  }

  // 3. Check for dependents
  const dependents = findDependents(name, installedNames);
  if (dependents.length > 0 && !force) {
    return err(
      new Error(
        `Block '${name}' is required by: ${dependents.join(", ")}. Use force to remove anyway.`,
      ),
    );
  }

  // 4. Get files to remove
  const blockManifest = FIXTURE_MANIFESTS[name];
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
): ReadonlyArray<string> {
  const dependents: string[] = [];

  for (const installedName of installedNames) {
    const manifest = FIXTURE_MANIFESTS[installedName];
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
