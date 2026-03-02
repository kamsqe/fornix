import { defineCommand } from "citty";

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
  run({ args }) {
    // TODO: Phase 18+ — wire to block placement logic
    console.log("🚧 add command not yet implemented");
    console.log("   block:", args.block);
    console.log("   variant:", args.variant);
  },
});
