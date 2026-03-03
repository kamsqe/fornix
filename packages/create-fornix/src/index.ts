import { runMain } from "citty";
import { main } from "./cli/index.js";

// When invoked as `npx create-fornix my-site`, auto-route to `create my-site`.
// Without this, citty treats "my-site" as an unknown subcommand.
const KNOWN_COMMANDS = new Set(["create", "add", "remove", "list", "status", "doctor", "mcp"]);
const firstArg = process.argv[2];

if (firstArg && !firstArg.startsWith("-") && !KNOWN_COMMANDS.has(firstArg)) {
  process.argv.splice(2, 0, "create");
}

runMain(main);
