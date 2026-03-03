import { defineCommand } from "citty";

export const statusCommand = defineCommand({
  meta: {
    name: "status",
    description: "Show current Fornix project configuration and installed blocks",
  },
  args: {
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Show full configuration details",
      default: false,
    },
  },
  run({ args }) {
    // TODO: Phase 18+ — read fornix.json and display status
    console.log("🚧 status command not yet implemented");
    if (args.json) {
      console.log(JSON.stringify({ status: "not implemented" }));
    }
  },
});
