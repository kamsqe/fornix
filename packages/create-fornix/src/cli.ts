#!/usr/bin/env node
/**
 * Fornix CLI — v2 spine.
 *
 * Day-3 surface: non-interactive, flag-driven scaffold.
 *   create-fornix <name> [--blocks ...] [--palette ...] [--yes]
 *
 * Interactive prompts and AI mode are layered on later. Even when those
 * arrive, this flag-driven path is the contract that recipe/AI/manual all
 * eventually project into.
 */
import { defineCommand, runMain } from "citty";
import { resolve } from "node:path";

import { scaffoldProject } from "./scaffold/scaffold-project.js";
import { loadPaletteData } from "./scaffold/palette.js";
import type { ResolvedConfig } from "./schemas/config.js";

const main = defineCommand({
  meta: {
    name: "create-fornix",
    version: "0.2.0",
    description:
      "Scaffold Astro + Cloudflare projects from a curated block registry",
  },
  args: {
    name: {
      type: "positional",
      description: "Project directory name (created relative to cwd)",
      required: true,
    },
    blocks: {
      type: "string",
      description: "Comma-separated block names",
      default: "hero-gradient,features-grid,cta-banner,footer-minimal",
    },
    palette: {
      type: "string",
      description: "Palette preset name (e.g. midnight, neon-tokyo)",
      default: "midnight",
    },
    yes: {
      type: "boolean",
      alias: "y",
      description: "Non-interactive — accept all defaults",
      default: false,
    },
  },
  async run({ args }) {
    const projectDir = resolve(process.cwd(), args.name);

    // Day-3 spine is always non-interactive. The `--yes` flag exists so the
    // contract stays compatible with the interactive flows to come.
    if (!args.yes) {
      // No-op for now — surfaced as a one-line note so users aren't surprised.
      process.stderr.write(
        "Note: day-3 CLI is non-interactive. Pass --yes to silence this message.\n",
      );
    }

    const paletteResult = loadPaletteData(args.palette);
    if (!paletteResult.ok) {
      process.stderr.write(`error: ${paletteResult.error.message}\n`);
      process.exit(1);
    }
    const palette = paletteResult.value;

    const blockNames = args.blocks
      .split(",")
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    if (blockNames.length === 0) {
      process.stderr.write("error: --blocks must contain at least one block name\n");
      process.exit(1);
    }

    const config: ResolvedConfig = {
      projectName: args.name,
      projectDir,
      renderMode: "static",
      deployTarget: "static",
      database: "none",
      cssEngine: "vanilla",
      packageManager: "npm",
      blocks: blockNames.map((name: string) => ({ name, variant: "default" })),
      locales: ["en"],
      defaultLocale: "en",
      palette: {
        preset: palette.name,
        colors: palette.colors,
      },
      themeSwitcher: false,
      createdWith: "manual",
    };

    const result = await scaffoldProject(config);
    if (!result.ok) {
      process.stderr.write(`error: ${result.error.message}\n`);
      process.exit(1);
    }

    process.stdout.write(`✓ Scaffolded ${args.name} in ${projectDir}\n`);
    process.stdout.write(`  cd ${args.name}\n`);
    process.stdout.write(`  npm install\n`);
    process.stdout.write(`  npm run dev\n`);
  },
});

runMain(main);
