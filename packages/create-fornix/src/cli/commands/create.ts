import { defineCommand } from "citty";

export const createCommand = defineCommand({
  meta: {
    name: "create",
    description: "Scaffold a new Fornix project",
  },
  args: {
    dir: {
      type: "positional",
      description: "Project directory (defaults to current directory)",
      required: false,
    },
    ai: {
      type: "boolean",
      description: "AI-assisted mode (default)",
      default: true,
    },
    manual: {
      type: "boolean",
      description: "Traditional interactive prompts",
      default: false,
    },
    yes: {
      type: "boolean",
      alias: "y",
      description: "Accept defaults, non-interactive",
      default: false,
    },
    render: {
      type: "string",
      description: "Set render mode: static, hybrid, server",
    },
    deploy: {
      type: "string",
      description: "Set deploy target: cloudflare, vercel, netlify, static",
    },
    blocks: {
      type: "string",
      description: "Comma-separated block names",
    },
    database: {
      type: "string",
      description: "Set database: none, d1, turso, astro-db, postgres",
    },
    css: {
      type: "string",
      description: "Set CSS engine: tailwind (default) or vanilla",
    },
    locales: {
      type: "string",
      description: "Comma-separated locale codes (e.g. en,es,ar)",
    },
    palette: {
      type: "string",
      description: "Use a pre-built palette by name",
    },
    "theme-switcher": {
      type: "boolean",
      description: "Include the theme switcher for runtime palette swapping",
      default: false,
    },
    "dry-run": {
      type: "boolean",
      description: "Show what would be generated without writing",
      default: false,
    },
    provider: {
      type: "string",
      description: "Force a specific AI provider",
    },
    recipe: {
      type: "string",
      description: "Use a preset recipe (saas, agency, docs)",
    },
    verbose: {
      type: "boolean",
      description: "Detailed output",
      default: false,
    },
  },
  run({ args }) {
    // TODO: Phase 18+ — wire to interactive prompts or flag-driven scaffold
    console.log("🚧 create command not yet implemented");
    console.log("   dir:", args.dir ?? ".");
    if (args.verbose) {
      console.log("   args:", JSON.stringify(args, null, 2));
    }
  },
});
