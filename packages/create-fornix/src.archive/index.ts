import { runMain } from "citty";
import { main } from "./cli/index.js";

// Auto-route to `create` when:
//   - `npx create-fornix my-site`      → positional arg that isn't a known command
//   - `npx create-fornix --manual`      → flags only, no known command
//   - `npx create-fornix --recipe saas` → flags only, no known command
//
// Skip auto-routing for:
//   - `npx create-fornix` (no args)     → show help
//   - `npx create-fornix --help`        → show help
//   - `npx create-fornix --version`     → show version
//   - `npx create-fornix add ...`       → explicit subcommand
const KNOWN_COMMANDS = new Set(["create", "add", "remove", "list", "status", "doctor", "mcp"]);
const HELP_FLAGS = new Set(["--help", "-h", "--version", "-V"]);

const args = process.argv.slice(2);
const hasKnownCommand = args.some((arg) => KNOWN_COMMANDS.has(arg));
const isHelpOrVersion = args.some((arg) => HELP_FLAGS.has(arg));
const hasArgs = args.length > 0;

if (hasArgs && !hasKnownCommand && !isHelpOrVersion) {
  process.argv.splice(2, 0, "create");
}

runMain(main);
