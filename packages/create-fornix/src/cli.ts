#!/usr/bin/env node
/**
 * Fornix CLI.
 *
 * Surface:
 *   create-fornix <name> [--archetype ...] [--blocks ...] [--palette ...] [--prompt "..."] [--yes]
 *
 * Two top-level modes (mutually exclusive on first use; --archetype wins
 * when both are passed):
 *
 *   • Archetype mode (recommended)
 *       --archetype saas | agency | portfolio | gym | restaurant
 *     Loads a pre-authored bundle (palette + site.config + multi-page
 *     block selection + content overrides). Ship a near-final site in
 *     under a minute.
 *
 *   • Custom block mode
 *       --blocks header-sticky,hero-text,features-grid,...
 *     The escape hatch — pick your own block list and palette. Single-page.
 *
 * AI copy generation activates when ANTHROPIC_API_KEY is set AND --prompt
 * is non-empty. AI overrides land on top of archetype/block defaults.
 */
import { defineCommand, runMain } from "citty";
import { resolve } from "node:path";

import { scaffoldProject } from "./scaffold/scaffold-project.js";
import { loadPaletteData } from "./scaffold/palette.js";
import { loadArchetype, archetypeOverlay } from "./scaffold/archetype.js";
import type { ResolvedConfig } from "./schemas/config.js";
import { createAnthropicProvider } from "./ai/providers/anthropic.js";
import type { AIProvider, BrandContext } from "./ai/provider.js";

const main = defineCommand({
  meta: {
    name: "create-fornix",
    version: "0.3.0",
    description:
      "Scaffold Astro projects from curated archetypes + a 13-block design system",
  },
  args: {
    name: {
      type: "positional",
      description: "Project directory name (created relative to cwd)",
      required: true,
    },
    archetype: {
      type: "string",
      description:
        "Archetype name (saas, agency, portfolio, gym, restaurant). Overrides --blocks and --palette.",
      default: "",
    },
    blocks: {
      type: "string",
      description: "Comma-separated block names (custom mode only)",
      default: "header-sticky,hero-text,features-grid,cta-strip,footer-columns",
    },
    palette: {
      type: "string",
      description:
        "Palette preset name (obsidian, paper, fraktur, ember, terracotta, sage, aurora). Overrides archetype default if set explicitly.",
      default: "",
    },
    deploy: {
      type: "string",
      description:
        "Deploy target (cloudflare | vercel | netlify | static). Default: static.",
      default: "static",
    },
    prompt: {
      type: "string",
      description:
        "Describe your project. When ANTHROPIC_API_KEY is set, this drives AI copy generation on top of archetype defaults.",
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

    // ── Archetype loading (when --archetype is set) ───────────────
    const archetypeName = args.archetype.trim();
    const archetypeResult = archetypeName
      ? loadArchetype(archetypeName)
      : null;
    if (archetypeResult && !archetypeResult.ok) {
      process.stderr.write(`error: ${archetypeResult.error.message}\n`);
      process.exit(1);
    }
    const archetype = archetypeResult?.ok ? archetypeResult.value : null;

    // ── Palette resolution ────────────────────────────────────────
    // Priority: explicit --palette flag → archetype default → fallback obsidian
    const paletteName =
      args.palette.trim() || archetype?.palette || "obsidian";
    const paletteResult = loadPaletteData(paletteName);
    if (!paletteResult.ok) {
      process.stderr.write(`error: ${paletteResult.error.message}\n`);
      process.exit(1);
    }
    const palette = paletteResult.value;

    // ── Block list / pages resolution ─────────────────────────────
    let blocks: ResolvedConfig["blocks"];
    let pages: ResolvedConfig["pages"];
    if (archetype) {
      const overlay = archetypeOverlay(archetype, ["en"]);
      blocks = overlay.blockNames.map((name) => ({ name, variant: "default" }));
      pages = overlay.pages;
    } else {
      const blockNames = args.blocks
        .split(",")
        .map((b: string) => b.trim())
        .filter((b: string) => b.length > 0);
      if (blockNames.length === 0) {
        process.stderr.write(
          "error: --blocks must contain at least one block name\n",
        );
        process.exit(1);
      }
      blocks = blockNames.map((name: string) => ({ name, variant: "default" }));
      pages = undefined;
    }

    const deployTarget = parseDeployTarget(args.deploy);
    if (!deployTarget) {
      process.stderr.write(
        `error: --deploy must be one of: cloudflare, vercel, netlify, static (got "${args.deploy}")\n`,
      );
      process.exit(1);
    }

    const config: ResolvedConfig = {
      projectName: args.name,
      projectDir,
      renderMode: "static",
      deployTarget,
      database: "none",
      cssEngine: "vanilla",
      packageManager: "npm",
      blocks,
      pages,
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
    if (archetype) {
      process.stdout.write(
        `→ Archetype: ${archetype.displayName} (${archetype.pages.length} page${archetype.pages.length === 1 ? "" : "s"}, palette: ${palette.name})\n`,
      );
    }

    // Layer archetype content + site config into scaffold options.
    const overlay = archetype
      ? archetypeOverlay(archetype, ["en"])
      : null;

    const result = await scaffoldProject(config, {
      ...(aiSetup ?? {}),
      archetypeContent: overlay?.contentByLocale,
      siteConfigOverrides: overlay?.site,
    });
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

    printDeployHint(deployTarget, args.name);
  },
});

function printDeployHint(
  target: ResolvedConfig["deployTarget"],
  projectName: string,
): void {
  switch (target) {
    case "cloudflare":
      process.stdout.write(`\nDeploy to Cloudflare Pages:\n`);
      process.stdout.write(`  npm run build\n`);
      process.stdout.write(
        `  npx wrangler pages deploy dist --project-name ${projectName}\n`,
      );
      return;
    case "vercel":
      process.stdout.write(`\nDeploy to Vercel:\n`);
      process.stdout.write(`  npm run build\n`);
      process.stdout.write(`  npx vercel --prod\n`);
      return;
    case "netlify":
      process.stdout.write(`\nDeploy to Netlify:\n`);
      process.stdout.write(`  npm run build\n`);
      process.stdout.write(`  npx netlify deploy --prod\n`);
      return;
    case "static":
      // Static is the default — no deploy command to suggest.
      return;
  }
}

function parseDeployTarget(
  value: string,
): ResolvedConfig["deployTarget"] | null {
  if (
    value === "cloudflare" ||
    value === "vercel" ||
    value === "netlify" ||
    value === "static"
  ) {
    return value;
  }
  return null;
}

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

  const brand: BrandContext = {
    name: opts.projectName,
    description,
    tone: "clear, specific, professional",
    industry: "general",
  };

  return { provider, brand, model };
}

runMain(main);
