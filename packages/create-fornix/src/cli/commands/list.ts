import { defineCommand } from "citty";
import pc from "picocolors";
import type { BlockManifest } from "fornix-registry";
import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { isOk } from "../../utils/result.js";

// ── Types ────────────────────────────────────────────────

interface ListArgs {
  readonly category?: string;
  readonly type?: string;
  readonly json: boolean;
  readonly verbose: boolean;
}

// ── Command Definition ───────────────────────────────────

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List available blocks from the Fornix registry",
  },
  args: {
    category: {
      type: "string",
      description: "Filter blocks by category",
    },
    type: {
      type: "string",
      description: "Filter blocks by type (section, integration)",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Show full block details",
      default: false,
    },
  },
  async run({ args }) {
    const typedArgs = args as unknown as ListArgs;
    
    // Fetch real registry
    const registryResult = await fetchRegistryIndex();
    if (!isOk(registryResult)) {
      console.error(pc.red(`\u2716 Failed to fetch block registry: ${registryResult.error.message}`));
      process.exitCode = 1;
      return;
    }
    const manifests = registryResult.value.blocks;
    
    const blocks = getFilteredBlocks(typedArgs, manifests);

    if (blocks.length === 0) {
      console.log(pc.yellow("No blocks found matching your filters."));
      return;
    }

    if (typedArgs.json) {
      printJson(blocks);
    } else {
      printFormatted(blocks, typedArgs.verbose);
    }
  },
});

// ── Helpers ──────────────────────────────────────────────

function getFilteredBlocks(args: ListArgs, manifests: Readonly<Record<string, BlockManifest>>): ReadonlyArray<BlockManifest> {
  let blocks = Object.values(manifests);

  if (args.type) {
    const filterType = args.type.toLowerCase();
    blocks = blocks.filter((b) => b.type === filterType);
  }

  if (args.category) {
    const filterCategory = args.category.toLowerCase();
    blocks = blocks.filter((b) => b.category === filterCategory);
  }

  return blocks.sort((a, b) => a.name.localeCompare(b.name));
}

function printJson(blocks: ReadonlyArray<BlockManifest>): void {
  const output = blocks.map((b) => ({
    name: b.name,
    type: b.type,
    category: b.category,
    description: b.description,
    tags: b.tags,
    requiredMode: b.requiredMode,
    requires: b.requires,
  }));
  console.log(JSON.stringify(output, null, 2));
}

function printFormatted(
  blocks: ReadonlyArray<BlockManifest>,
  verbose: boolean,
): void {
  console.log();
  console.log(
    pc.bold(`  📦 Fornix Blocks`) +
      pc.dim(` (${blocks.length} available)`),
  );
  console.log();

  // Group by type
  const grouped = new Map<string, BlockManifest[]>();
  for (const block of blocks) {
    const type = block.type;
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(block);
  }

  const typeIcons: Record<string, string> = {
    section: "🧩",
    integration: "⚙️",
    feature: "✨",
    layout: "📐",
  };

  for (const [type, typeBlocks] of grouped) {
    const icon = typeIcons[type] ?? "📦";
    console.log(
      `  ${icon} ${pc.bold(pc.cyan(type.toUpperCase()))} ${pc.dim(`(${typeBlocks.length})`)}`,
    );
    console.log();

    for (const block of typeBlocks) {
      const name = pc.bold(pc.white(block.name));
      const desc = pc.dim(block.description);
      const tags = block.tags.map((t) => pc.dim(`#${t}`)).join(" ");

      console.log(`    ${name}`);
      console.log(`    ${desc}`);

      if (verbose) {
        console.log(`    ${pc.dim("Category:")} ${block.category}`);
        if (block.requiredMode) {
          console.log(
            `    ${pc.dim("Requires:")} ${pc.yellow(block.requiredMode)} mode`,
          );
        }
        if (block.requires.length > 0) {
          console.log(
            `    ${pc.dim("Depends on:")} ${block.requires.join(", ")}`,
          );
        }
        if (Object.keys(block.dependencies).length > 0) {
          const deps = Object.entries(block.dependencies)
            .map(([k, v]) => `${k}@${v}`)
            .join(", ");
          console.log(`    ${pc.dim("npm deps:")} ${deps}`);
        }
      }

      console.log(`    ${tags}`);
      console.log();
    }
  }
}
