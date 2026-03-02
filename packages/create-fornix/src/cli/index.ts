import { defineCommand } from "citty";
import { createCommand } from "./commands/create.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { listCommand } from "./commands/list.js";
import { statusCommand } from "./commands/status.js";

export const main = defineCommand({
  meta: {
    name: "fornix",
    version: "0.0.1",
    description: "Fornix — CLI-first Astro + Cloudflare project generator",
  },
  subCommands: {
    create: createCommand,
    add: addCommand,
    remove: removeCommand,
    list: listCommand,
    status: statusCommand,
  },
});
