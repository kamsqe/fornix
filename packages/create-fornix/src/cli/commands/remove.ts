import { defineCommand } from "citty";
import pc from "picocolors";
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, rmdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { BlockManifest } from "fornix-registry";
import { FIXTURE_MANIFESTS } from "../fixture-registry.js";

// ── Types ────────────────────────────────────────────────

interface RemoveArgs {
  readonly block: string;
  readonly "dry-run": boolean;
  readonly force: boolean;
  readonly verbose: boolean;
}

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

// ── Command Definition ───────────────────────────────────

export const removeCommand = defineCommand({
  meta: {
    name: "remove",
    description: "Remove a block from an existing Fornix project",
  },
  args: {
    block: {
      type: "positional",
      description: "Block name to remove",
      required: true,
    },
    "dry-run": {
      type: "boolean",
      description: "Show what would change without writing",
      default: false,
    },
    force: {
      type: "boolean",
      description: "Force removal even if other blocks depend on this one",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Detailed output",
      default: false,
    },
  },
  run({ args }) {
    const typedArgs = args as unknown as RemoveArgs;
    const cwd = process.cwd();

    // 1. Read fornix.json
    const manifestPath = join(cwd, "fornix.json");
    if (!existsSync(manifestPath)) {
      console.error(
        pc.red("✗ No fornix.json found. Are you in a Fornix project?"),
      );
      process.exit(1);
    }

    const manifestRaw = readFileSync(manifestPath, "utf-8");
    const manifest: FornixManifest = JSON.parse(manifestRaw);

    // 2. Check if block is installed
    const blockName = typedArgs.block;
    const installedNames = new Set(manifest.blocks.map((b) => b.name));

    if (!installedNames.has(blockName)) {
      console.log(
        pc.yellow(`⚠ Block '${blockName}' is not installed.`),
      );
      return;
    }

    // 3. Check for dependents
    const dependents = findDependents(blockName, installedNames);
    if (dependents.length > 0 && !typedArgs.force) {
      console.log(
        pc.yellow(
          `⚠ Block '${blockName}' is required by: ${dependents.join(", ")}`,
        ),
      );
      console.log(
        pc.dim("  Use --force to remove anyway, or remove dependent blocks first."),
      );
      return;
    }

    // 4. Get files to remove
    const blockManifest = FIXTURE_MANIFESTS[blockName];
    const filesToRemove: string[] = [];

    if (blockManifest) {
      for (const file of blockManifest.files) {
        const filePath = join(cwd, file.destination);
        if (existsSync(filePath)) {
          filesToRemove.push(filePath);
        }
      }
    }

    // 5. Dry run check
    if (typedArgs["dry-run"]) {
      console.log(pc.bold("\n  Dry run — no files removed\n"));
      console.log(`  ${pc.red("-")} ${pc.bold(blockName)}`);
      for (const file of filesToRemove) {
        console.log(`  ${pc.dim("×")} ${file}`);
      }
      console.log();
      return;
    }

    // 6. Remove files
    for (const filePath of filesToRemove) {
      unlinkSync(filePath);
      if (typedArgs.verbose) {
        console.log(`  ${pc.dim("×")} ${filePath}`);
      }

      // Clean up empty parent directories
      tryRemoveEmptyDir(dirname(filePath), cwd);
    }

    // 7. Update fornix.json
    manifest.blocks = manifest.blocks.filter((b) => b.name !== blockName);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    // 8. Print summary
    console.log();
    console.log(`  ${pc.red("-")} ${pc.bold(blockName)} removed`);
    if (dependents.length > 0) {
      console.log(
        pc.yellow(
          `  ⚠ Warning: ${dependents.join(", ")} may no longer work correctly.`,
        ),
      );
    }
    console.log(
      pc.dim(
        `\n  ${filesToRemove.length} files removed, fornix.json updated.`,
      ),
    );
    console.log();
  },
});

// ── Helpers ──────────────────────────────────────────────

function findDependents(
  blockName: string,
  installedNames: ReadonlySet<string>,
): ReadonlyArray<string> {
  const dependents: string[] = [];

  for (const name of installedNames) {
    const manifest = FIXTURE_MANIFESTS[name];
    if (manifest && manifest.requires.includes(blockName)) {
      dependents.push(name);
    }
  }

  return dependents;
}

function tryRemoveEmptyDir(dirPath: string, rootPath: string): void {
  // Don't remove project root or above
  if (dirPath === rootPath || !dirPath.startsWith(rootPath)) return;

  try {
    const entries = readdirSync(dirPath);
    if (entries.length === 0) {
      rmdirSync(dirPath);
      // Recurse to clean parent
      tryRemoveEmptyDir(dirname(dirPath), rootPath);
    }
  } catch {
    // Ignore errors
  }
}
