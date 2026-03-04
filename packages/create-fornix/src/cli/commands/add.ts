import { defineCommand } from "citty";
import pc from "picocolors";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { BlockManifest } from "fornix-registry";
import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { fetchBlocks } from "../../registry/block-fetcher.js";
import { isOk } from "../../utils/result.js";
import { addBlockToPage, addBlockToLayout, isLayoutBlock } from "../../scaffold/page-updater.js";

// ── Types ────────────────────────────────────────────────

interface AddArgs {
  readonly block: string;
  readonly variant: string;
  readonly "dry-run": boolean;
  readonly verbose: boolean;
}

interface FornixManifest {
  version: string;
  createdAt: string;
  renderMode: string;
  blocks: Array<{
    name: string;
    version: string;
    variant: string;
    installedAt: string;
  }>;
  [key: string]: unknown;
}

// ── Command Definition ───────────────────────────────────

export const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "Add a block to an existing Fornix project",
  },
  args: {
    block: {
      type: "positional",
      description: "Block name to add (e.g. hero-gradient, auth-better-auth)",
      required: true,
    },
    variant: {
      type: "string",
      description: "Block variant to use (defaults to 'default')",
      default: "default",
    },
    "dry-run": {
      type: "boolean",
      description: "Show what would change without writing",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Detailed output",
      default: false,
    },
  },
  async run({ args }) {
    const typedArgs = args as unknown as AddArgs;
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

    // 1b. Fetch real registry
    const registryResult = await fetchRegistryIndex();
    if (!isOk(registryResult)) {
      console.error(pc.red(`\u2716 Failed to fetch block registry: ${registryResult.error.message}`));
      process.exitCode = 1;
      return;
    }
    const manifests = registryResult.value.blocks;

    // 2. Look up block
    const blockName = typedArgs.block;
    const blockManifest = manifests[blockName];
    if (!blockManifest) {
      console.error(pc.red(`✗ Block '${blockName}' not found in registry.`));
      console.error(
        pc.dim(
          `  Available: ${Object.keys(manifests).join(", ")}`,
        ),
      );
      process.exitCode = 1;
      return;
    }

    // 3. Check if already installed
    const installedNames = new Set(manifest.blocks.map((b) => b.name));
    if (installedNames.has(blockName)) {
      console.log(
        pc.yellow(`⚠ Block '${blockName}' is already installed.`),
      );
      return;
    }

    // 4. Resolve dependencies
    const blocksToAdd = resolveDependencies(blockName, installedNames, manifests);

    // 5. Check for conflicts with installed blocks
    for (const name of blocksToAdd) {
      const m = manifests[name];
      if (m?.conflicts && m.conflicts.length > 0) {
        for (const conflictName of m.conflicts) {
          if (installedNames.has(conflictName)) {
            console.error(
              pc.red(
                `✗ Block '${name}' conflicts with installed block '${conflictName}'.`,
              ),
            );
            console.log(
              pc.dim(
                `  Remove '${conflictName}' first: npx create-fornix remove ${conflictName}`,
              ),
            );
            process.exitCode = 1;
            return;
          }
        }
      }
    }

    // 6. Check mode compatibility
    for (const name of blocksToAdd) {
      const m = manifests[name];
      if (m?.requiredMode && manifest.renderMode !== m.requiredMode) {
        console.error(
          pc.red(
            `✗ Block '${name}' requires '${m.requiredMode}' mode, but project uses '${manifest.renderMode}'.`,
          ),
        );
        process.exitCode = 1;
        return;
      }
    }

    // 6. Fetch all block files
    console.log(pc.dim("Fetching blocks..."));
    const blockResults = await fetchBlocks(blocksToAdd);
    const filesToWrite: Array<{ path: string; content: string }> = [];

    for (let i = 0; i < blocksToAdd.length; i++) {
      const name = blocksToAdd[i];
      const result = blockResults[i];

      if (!result || !isOk(result)) {
        console.error(pc.red(`✗ Failed to fetch files for block '${name}'.`));
        process.exitCode = 1;
        return;
      }

      const bManifest = result.value.manifest;
      const sources = result.value.files;

      for (const file of bManifest.files) {
        // Skip conditional files for add if missing context, 
        // or we'd need context evaluation here. Assumes basic add copies all for now or 
        // rely on manual cleanup if condition fails later.
        const content = sources[file.source];
        if (content === undefined) {
          console.error(
            pc.red(
              `✗ Source file '${file.source}' not found for block '${name}'.`,
            ),
          );
          process.exitCode = 1;
          return;
        }

        filesToWrite.push({
          path: join(cwd, file.destination),
          content,
        });
      }
    }

    // 7. Dry run check
    if (typedArgs["dry-run"]) {
      console.log(pc.bold("\n  Dry run — no files written\n"));
      for (const name of blocksToAdd) {
        const isDep = name !== blockName;
        console.log(
          `  ${isDep ? pc.dim("(dep)") : pc.green("+")} ${pc.bold(name)}`,
        );
      }
      console.log();
      for (const file of filesToWrite) {
        console.log(`  ${pc.dim("→")} ${file.path}`);
      }
      console.log();
      return;
    }

    // 8. Write files
    for (const file of filesToWrite) {
      mkdirSync(dirname(file.path), { recursive: true });
      writeFileSync(file.path, file.content);
      if (typedArgs.verbose) {
        console.log(`  ${pc.dim("→")} ${file.path}`);
      }
    }

    // 9. Update fornix.json
    const now = new Date().toISOString();
    for (const name of blocksToAdd) {
      const bManifest = manifests[name];
      if (!bManifest) continue;
      manifest.blocks.push({
        name,
        version: bManifest.version,
        variant: name === blockName ? typedArgs.variant : "default",
        installedAt: now,
      });
    }

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    // 9b. Update index.astro or Layout.astro depending on block category
    const indexPath = join(cwd, "src/pages/index.astro");
    const layoutPath = join(cwd, "src/layouts/Layout.astro");

    for (const name of blocksToAdd) {
      const bManifest = manifests[name];
      if (!bManifest || bManifest.type !== "section") continue;

      if (isLayoutBlock(name, cwd)) {
        // Header/footer → Layout.astro
        if (existsSync(layoutPath)) {
          const layoutContent = readFileSync(layoutPath, "utf-8");
          const updated = addBlockToLayout(layoutContent, name, cwd);
          if (updated !== layoutContent) {
            writeFileSync(layoutPath, updated);
            if (typedArgs.verbose) {
              console.log(`  ${pc.dim("✎")} updated Layout.astro (${name})`);
            }
          }
        }
      } else {
        // Content block → index.astro
        if (existsSync(indexPath)) {
          let pageContent = readFileSync(indexPath, "utf-8");
          pageContent = addBlockToPage(pageContent, name, cwd);
          writeFileSync(indexPath, pageContent);
          if (typedArgs.verbose) {
            console.log(`  ${pc.dim("✎")} updated index.astro (${name})`);
          }
        }
      }
    }

    // 10. Print summary
    console.log();
    for (const name of blocksToAdd) {
      const isDep = name !== blockName;
      if (isDep) {
        console.log(
          `  ${pc.green("+")} ${pc.bold(name)} ${pc.dim("(auto-added dependency)")}`,
        );
      } else {
        console.log(`  ${pc.green("+")} ${pc.bold(name)}`);
      }
    }
    console.log(
      pc.dim(
        `\n  ${filesToWrite.length} files placed, fornix.json updated.`,
      ),
    );
    console.log();
  },
});

// ── Dependency Resolution ────────────────────────────────

function resolveDependencies(
  blockName: string,
  installedNames: ReadonlySet<string>,
  manifests: Readonly<Record<string, BlockManifest>>,
): ReadonlyArray<string> {
  const result: string[] = [];
  const visited = new Set<string>();

  function walk(name: string): void {
    if (visited.has(name) || installedNames.has(name)) return;
    visited.add(name);

    const manifest = manifests[name];
    if (!manifest) return;

    // Walk dependencies first (depth-first)
    for (const dep of manifest.requires) {
      walk(dep);
    }

    result.push(name);
  }

  walk(blockName);
  return result;
}
