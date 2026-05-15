import { defineCommand } from "citty";
import pc from "picocolors";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { BlockManifest } from "fornix-registry";
import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { isOk } from "../../utils/result.js";

interface FornixManifest {
  readonly version: string;
  readonly createdAt: string;
  readonly createdWith?: string;
  readonly renderMode: string;
  readonly deployTarget: string;
  readonly database?: string;
  readonly locales?: ReadonlyArray<string>;
  readonly defaultLocale?: string;
  readonly palette?: string;
  readonly themeSwitcher?: boolean;
  readonly blocks: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
    readonly variant: string;
    readonly installedAt: string;
  }>;
}

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description: "Diagnose common issues in a Fornix project",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    const manifestPath = join(cwd, "fornix.json");
    let hasErrors = false;
    const errors: string[] = [];

    function reportError(msg: string) {
      hasErrors = true;
      errors.push(msg);
      if (!args.json) {
        console.error(pc.red(`✗ ${msg}`));
      }
    }

    // ── Check 1: Missing fornix.json ──────────────
    if (!existsSync(manifestPath)) {
      reportError("No fornix.json found in the current directory.");
      if (args.json) {
        console.log(JSON.stringify({ healthy: false, errors }));
      }
      process.exit(1);
    }

    let manifest: FornixManifest;
    try {
      const raw = readFileSync(manifestPath, "utf-8");
      manifest = JSON.parse(raw) as FornixManifest;
    } catch {
      reportError("Failed to parse fornix.json.");
      if (args.json) {
        console.log(JSON.stringify({ healthy: false, errors }));
      }
      process.exit(1);
    }

    // 1b. Fetch real registry
    const registryResult = await fetchRegistryIndex();
    if (!isOk(registryResult)) {
      reportError(`Failed to fetch block registry: ${registryResult.error.message}`);
      if (args.json) {
        console.log(JSON.stringify({ healthy: false, errors }));
      }
      process.exitCode = 1;
      return;
    }
    const manifests = registryResult.value.blocks;

    const isMultiLocale = manifest.locales && manifest.locales.length >= 2;
    const locales = isMultiLocale ? manifest.locales! : [""];

    const installedBlocks = new Set(manifest.blocks.map((b) => b.name));

    // ── Check 2: Missing installed block files ──────────────
    for (const block of manifest.blocks) {
      const bManifest = manifests[block.name];
      if (bManifest) {
        for (const file of bManifest.files) {
          const filePath = join(cwd, file.destination);
          if (!existsSync(filePath)) {
            reportError(`Missing expected file for installed block '${block.name}': ${file.destination}`);
          }
        }
      }
    }

    // ── Check 3: Orphaned block files ──────────────
    for (const [name, bManifest] of Object.entries(manifests)) {
      if (!installedBlocks.has(name)) {
        // Block is not installed, but do its files exist?
        const foundOrphaned = bManifest.files.some((file) => {
          return existsSync(join(cwd, file.destination));
        });

        if (foundOrphaned) {
          reportError(`Orphaned block files detected for '${name}'. The block is not in fornix.json.`);
        }
      }
    }

    // ── Check 4: Broken content collection references ──────────────
    let requiresContentConfig = false;
    const missingContentFiles: string[] = [];

    for (const block of manifest.blocks) {
      const bManifest = manifests[block.name];
      if (!bManifest) continue;

      const hasContentSlots = bManifest.ai?.contentSlots && Object.keys(bManifest.ai.contentSlots).length > 0;
      const hasCollections = bManifest.collections && bManifest.collections.length > 0;

      if (hasContentSlots || hasCollections) {
        requiresContentConfig = true;
      }

      if (hasContentSlots) {
        const subdirectory = getCategory(bManifest.type);
        for (const locale of locales) {
          let pathFragment = `src/content/${subdirectory}/${bManifest.name}.json`;
          if (locale !== "") {
             pathFragment = `src/content/${locale}/${subdirectory}/${bManifest.name}.json`;
          }
          if (!existsSync(join(cwd, pathFragment))) {
            missingContentFiles.push(pathFragment);
          }
        }
      }
    }

    if (requiresContentConfig) {
      if (!existsSync(join(cwd, "src/content/config.ts"))) {
        reportError("Missing expected file: src/content/config.ts");
      }
    }

    for (const missing of missingContentFiles) {
       reportError(`Broken content reference: missing ${missing}`);
    }


    if (hasErrors) {
      if (args.json) {
        console.log(JSON.stringify({ healthy: false, errors }));
      } else {
        console.log();
        console.log(pc.yellow("Run 'fornix add <block>' to repair missing blocks or 'fornix remove <block>' to clean orphaned files."));
      }
      process.exit(1);
    } else {
      if (args.json) {
        console.log(JSON.stringify({ healthy: true, errors: [] }));
      } else {
        console.log(pc.green("✓ Project is healthy!"));
      }
    }
  },
});

function getCategory(type: string) {
  switch (type) {
    case "section": return "sections";
    case "integration": return "integrations";
    case "feature": return "features";
    case "layout": return "layouts";
    default: return type;
  }
}
