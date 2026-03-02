import { defineCommand } from "citty";

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
      description: "Filter blocks by type (section, integration, feature, layout)",
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
  run({ args }) {
    // TODO: Phase 18+ — wire to registry listing
    console.log("🚧 list command not yet implemented");
    if (args.category) console.log("   category:", args.category);
    if (args.type) console.log("   type:", args.type);
  },
});
