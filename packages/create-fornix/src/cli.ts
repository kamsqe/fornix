#!/usr/bin/env node
/**
 * Fornix CLI.
 *
 * Surface:
 *   create-fornix <name> [--blocks ...] [--palette ...] [--prompt "..."] [--yes]
 *
 * AI mode kicks in automatically when `ANTHROPIC_API_KEY` is set AND
 * `--prompt` is non-empty. Without one or both, the scaffolder uses each
 * block's `default-content.json`.
 */
import { defineCommand, runMain } from "citty";
import { resolve } from "node:path";

import { scaffoldProject } from "./scaffold/scaffold-project.js";
import { loadPaletteData } from "./scaffold/palette.js";
import type { ResolvedConfig } from "./schemas/config.js";
import { createAnthropicProvider } from "./ai/providers/anthropic.js";
import type { AIProvider, BrandContext } from "./ai/provider.js";

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
    prompt: {
      type: "string",
      description:
        "Describe your project. When ANTHROPIC_API_KEY is set, this drives AI copy generation.",
      default: "",
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

    if (!args.yes) {
      process.stderr.write(
        "Note: CLI is currently non-interactive. Pass --yes to silence this message.\n",
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

    // AI is opt-in via prompt + env. Either missing → defaults.
    const aiSetup = resolveAiSetup({
      prompt: args.prompt,
      projectName: args.name,
    });
    if (aiSetup) {
      process.stdout.write(
        `→ AI copy enabled via Anthropic (model: ${aiSetup.model})\n`,
      );
    }

    const result = await scaffoldProject(config, aiSetup ?? {});
    if (!result.ok) {
      process.stderr.write(`error: ${result.error.message}\n`);
      process.exit(1);
    }

    if (aiSetup) {
      const aiCount = result.value.copyTrace.filter(
        (e) => e.source === "ai",
      ).length;
      const fellBack = result.value.copyTrace.length - aiCount;
      process.stdout.write(
        `  AI-filled blocks: ${aiCount} · fallback to defaults: ${fellBack}\n`,
      );
    }

    process.stdout.write(`✓ Scaffolded ${args.name} in ${projectDir}\n`);
    process.stdout.write(`  cd ${args.name}\n`);
    process.stdout.write(`  npm install\n`);
    process.stdout.write(`  npm run dev\n`);
  },
});

interface AiSetup {
  provider: AIProvider;
  brand: BrandContext;
  model: string;
}

function resolveAiSetup(opts: {
  prompt: string;
  projectName: string;
}): AiSetup | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const description = opts.prompt.trim();

  if (!apiKey || description.length === 0) return null;

  const model = process.env.FORNIX_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
  const provider = createAnthropicProvider({ apiKey, model });

  // Day-4b derives brand fields heuristically from the prompt. A later pass
  // can promote this to a real LLM-driven brand-extraction step.
  const brand: BrandContext = {
    name: opts.projectName,
    description,
    tone: "clear, specific, professional",
    industry: "general",
  };

  return { provider, brand, model };
}

runMain(main);
