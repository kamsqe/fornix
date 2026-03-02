import { defineCommand } from "citty";

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
    verbose: {
      type: "boolean",
      description: "Detailed output",
      default: false,
    },
  },
  run({ args }) {
    // TODO: Phase 18+ — wire to block removal logic
    console.log("🚧 remove command not yet implemented");
    console.log("   block:", args.block);
  },
});
