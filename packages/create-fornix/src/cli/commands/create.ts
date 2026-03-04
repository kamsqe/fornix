import { defineCommand } from "citty";
import { resolve, basename } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { scaffold, type ScaffoldInput } from "../../scaffold/pipeline.js";
import { isOk } from "../../utils/result.js";
import type { ResolvedConfig } from "../../schemas/config.js";
import type { Palette } from "fornix-registry";
import { loadAllPalettes } from "../fixture-registry.js";
import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { fetchBlocks } from "../../registry/block-fetcher.js";
import type { BlockSourceMap } from "../../scaffold/block-placer.js";
import type { BlockDefaultContent } from "../../scaffold/content-wiring.js";
import { runManualFlow } from "../../prompts/manual-flow.js";
import { runPostScaffold } from "../../scaffold/post-scaffold.js";
import { runAIConversation } from "../../ai/conversation.js";
import type { BlockRegistry } from "../../ai/prompt-builder.js";
import type { AIProvider } from "../../ai/provider.js";
import { resolveProvider, type ProviderName } from "../../ai/resolve-provider.js";
import type { AIProvider as LegacyAIProvider } from "../../ai/providers/mock-provider.js";
import { RECIPES } from "../recipes.js";
import { validateProjectName, suggestProjectName } from "../../utils/project-name.js";

// ── Constants ───────────────────────────────────────────

const DEFAULT_COLORS = {
  primary: "#6366f1",
  secondary: "#818cf8",
  accent: "#c084fc",
  background: "#0f172a",
  foreground: "#f8fafc",
};

const DEFAULT_AI_DESCRIPTION = "Build a fintech landing page with user authentication and a modern dark theme";

const VALID_PROVIDER_NAMES: ReadonlyArray<string> = ["openai", "ollama", "cloudflare", "mock"];

// ── Create Command ──────────────────────────────────────

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
    description: {
      type: "string",
      description: "Project description for AI mode (used when --yes skips the prompt)",
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
    install: {
      type: "boolean",
      description: "Install dependencies after scaffold (use --no-install to skip)",
      default: true,
    },
    git: {
      type: "boolean",
      description: "Initialize git repo (use --no-git to skip)",
      default: true,
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
  async run({ args }) {
    // 1. Fetch real registry
    const registryResult = await fetchRegistryIndex();
    if (!isOk(registryResult)) {
      console.error(pc.red(`\u2716 Failed to fetch block registry: ${registryResult.error.message}`));
      process.exitCode = 1;
      return;
    }
    const manifests = registryResult.value.blocks;
    const allPalettes = registryResult.value.palettes.length > 0 ? registryResult.value.palettes : loadAllPalettes();

    // Detect if explicit config flags were provided (for backwards compatibility)
    const hasExplicitFlags = !!(
      args.render || args.deploy || args.blocks || args.database ||
      args.css || args.locales || args.palette || args.recipe
    );

    // ── Interactive manual prompts (--manual without --yes) ──
    if (args.manual && !args.yes) {
      const defaultProjectName = args.dir ? basename(resolve(args.dir)) : "my-project";

      const config = await runManualFlow({
        defaultProjectName,
        manifests,
        allPalettes,
      });

      if (!config) {
        process.exitCode = 0;
        return;
      }

      const projectDir = args.dir ? resolve(args.dir) : resolve(config.projectDir);
      const finalConfig = { ...config, projectDir } as ResolvedConfig;

      return runScaffold(finalConfig, manifests, allPalettes, args["dry-run"] ?? false, args.verbose ?? false, !(args.install ?? true), !(args.git ?? true));
    }

    // ── Flag-driven mode (--manual --yes, or explicit config flags) ──
    if (args.manual || hasExplicitFlags) {
      return runFlagDrivenMode(args, manifests, allPalettes);
    }

    // ── AI mode (default — no --manual, no explicit config flags) ──
    return runAIMode(args, manifests, allPalettes);
  },
});

// ── AI Mode ─────────────────────────────────────────────

async function runAIMode(
  args: Record<string, unknown>,
  manifests: Record<string, import("fornix-registry").BlockManifest>,
  allPalettes: ReadonlyArray<Palette>,
): Promise<void> {
  // 1. Validate and resolve provider
  const providerName = parseProviderName(args.provider);
  if (args.provider && !providerName) {
    console.error(pc.red(`\u2716 Unknown provider: ${String(args.provider)}`));
    console.error(pc.dim(`  Available: ${VALID_PROVIDER_NAMES.join(", ")}`));
    process.exitCode = 1;
    return;
  }

  const legacyProvider = await resolveProvider({
    provider: providerName,
    skipOllamaDetect: false,
  });

  if (!legacyProvider) {
    showNoProviderGuide();
    process.exitCode = 1;
    return;
  }

  // 2. Adapt legacy provider to conversation interface
  const provider = adaptProvider(legacyProvider);

  // 3. Get project description
  const description = await getDescription(args);
  if (!description) {
    process.exitCode = 0;
    return;
  }

  // 4. Build registry
  const registry: BlockRegistry = {
    blocks: Object.values(manifests),
    palettes: [...allPalettes],
  };

  // 5. Determine project directory and name
  const projectDir = resolve(String(args.dir ?? "."));
  const projectName = basename(projectDir);

  // ── Validate project name ──
  const nameResult = validateProjectName(projectName);
  if (!nameResult.ok) {
    console.error(pc.red(`✗ ${nameResult.error}`));
    process.exitCode = 1;
    return;
  }

  // 6. Run AI conversation
  const result = await runAIConversation({
    provider,
    registry,
    description,
    projectName,
    projectDir,
  });

  if (!result.ok) {
    console.error(pc.red(`\u2716 AI conversation failed: ${result.error.message}`));
    process.exitCode = 1;
    return;
  }

  const config = result.value;

  // 7. Show summary and confirm (skip with --yes)
  if (!args.yes) {
    showAISummary(config);
    const confirmed = await p.confirm({
      message: "Create this project?",
      initialValue: true,
    });
    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel("Operation cancelled.");
      process.exitCode = 0;
      return;
    }
  }

  // 8. Scaffold
  return runScaffold(
    config,
    manifests,
    allPalettes,
    (args["dry-run"] ?? false) === true,
    (args.verbose ?? false) === true,
    !((args.install ?? true) === true),
    !((args.git ?? true) === true),
  );
}

// ── Flag-Driven Mode ────────────────────────────────────

function runFlagDrivenMode(
  args: Record<string, unknown>,
  manifests: Record<string, import("fornix-registry").BlockManifest>,
  allPalettes: ReadonlyArray<Palette>,
): void {
  const projectDir = resolve(String(args.dir ?? "."));
  const projectName = basename(projectDir);

  // ── Validate project name ──
  const nameResult = validateProjectName(projectName);
  if (!nameResult.ok) {
    console.error(pc.red(`✗ ${nameResult.error}`));
    process.exitCode = 1;
    return;
  }

  // ── Apply Recipe overlay if provided ──
  const recipeName = args.recipe ? String(args.recipe) : undefined;
  let recipeOverlay: Partial<ResolvedConfig> = {};

  if (recipeName) {
    if (RECIPES[recipeName]) {
      recipeOverlay = RECIPES[recipeName];
      console.log(pc.green(`\u2714 Using recipe: ${pc.bold(recipeName)}`));
    } else {
      console.error(pc.red(`\u2716 Recipe "${recipeName}" not found.`));
      console.error(pc.dim(`  Available: ${Object.keys(RECIPES).join(", ")}`));
      process.exitCode = 1;
      return;
    }
  }

  const renderMode = (String(args.render ?? recipeOverlay.renderMode ?? "static")) as "static" | "hybrid" | "server";
  const deployTarget = (String(args.deploy ?? recipeOverlay.deployTarget ?? "cloudflare")) as "cloudflare" | "vercel" | "netlify" | "static";
  const database = (String(args.database ?? recipeOverlay.database ?? "none")) as "none" | "d1" | "turso" | "astro-db" | "postgres";
  const cssEngine = (String(args.css ?? recipeOverlay.cssEngine ?? "tailwind")) as "tailwind" | "vanilla";
  
  const localesRaw = String(args.locales ?? "");
  let locales = ["en"];
  let defaultLocale = "en";
  if (localesRaw) {
    locales = localesRaw.split(",").map((l) => l.trim()).filter(Boolean);
    defaultLocale = locales[0] ?? "en";
  } else if (recipeOverlay.locales) {
    locales = [...recipeOverlay.locales];
    defaultLocale = recipeOverlay.defaultLocale ?? locales[0] ?? "en";
  }

  const themeSwitcher = args["theme-switcher"] !== undefined ? args["theme-switcher"] === true : (recipeOverlay.themeSwitcher ?? false);

  // Parse blocks
  const blocksString = args.blocks ? String(args.blocks) : "";
  let blocks = recipeOverlay.blocks ? [...recipeOverlay.blocks] : [];
  if (blocksString) {
    const blockNames = blocksString.split(",").map((b) => b.trim()).filter(Boolean);
    blocks = blockNames.map((name) => ({ name, variant: "default" }));
  }

  // ── No blocks selected check ──
  if (blocks.length === 0) {
    console.error(pc.red("✗ No blocks selected."));
    console.error(pc.dim("  Use --recipe saas for a pre-built set, or drop --manual to let AI choose blocks for you."));
    process.exitCode = 1;
    return;
  }

  // Resolve palette
  let paletteColors = recipeOverlay.palette ? { ...recipeOverlay.palette.colors } : { ...DEFAULT_COLORS };
  let palettePreset: string | undefined = recipeOverlay.palette?.preset;

  if (args.palette) {
    const paletteName = String(args.palette);
    const found = allPalettes.find((palette) => palette.name === paletteName);
    if (found) {
      paletteColors = { ...found.colors };
      palettePreset = found.name;
    } else {
      console.error(pc.red(`\u2716 Palette "${paletteName}" not found in registry.`));
      console.error(pc.dim(`  Available: ${allPalettes.map((palette) => palette.name).join(", ")}`));
      process.exitCode = 1;
      return;
    }
  }

  const config: ResolvedConfig = {
    projectName,
    projectDir,
    renderMode,
    deployTarget,
    database,
    cssEngine,
    packageManager: "pnpm",
    blocks,
    locales,
    defaultLocale,
    palette: {
      ...(palettePreset ? { preset: palettePreset } : {}),
      colors: paletteColors,
    },
    themeSwitcher,
    createdWith: recipeName ? "recipe" : "manual",
  } as ResolvedConfig;

  return runScaffold(
    config,
    manifests,
    allPalettes,
    (args["dry-run"] ?? false) === true,
    (args.verbose ?? false) === true,
    !((args.install ?? true) === true),
    !((args.git ?? true) === true),
  );
}

// ── Shared Scaffold Execution ───────────────────────────

async function runScaffold(
  config: ResolvedConfig,
  manifests: Record<string, import("fornix-registry").BlockManifest>,
  allPalettes: ReadonlyArray<Palette>,
  dryRun: boolean,
  verbose: boolean,
  skipInstall: boolean,
  skipGit: boolean,
): Promise<void> {
  const spinner = p.spinner();
  spinner.start("Fetching blocks from registry...");

  // Actually download the real blocks for the project
  const blockNames = config.blocks.map((b) => b.name);
  const blockResults = await fetchBlocks(blockNames);
  
  const blockSources: Record<string, Record<string, string>> = {};
  const blockDefaultContent: Record<string, Record<string, unknown>> = {};

  for (const result of blockResults) {
    if (!isOk(result)) {
      spinner.stop(`Failed to fetch block '${result.error.blockName}'`, 1);
      console.error(pc.red(`\u2716 ${result.error.message}`));
      process.exitCode = 1;
      return;
    }

    const { manifest, files } = result.value;
    blockSources[manifest.name] = files;

    // Load default content if available
    try {
      if (files["default-content.json"]) {
        blockDefaultContent[manifest.name] = JSON.parse(files["default-content.json"]);
      }
    } catch (e) {
      console.error(pc.yellow(`⚠ Warning: Failed to parse default-content.json for block '${manifest.name}'`));
    }
  }

  spinner.stop("Blocks fetched successfully.");

  const input: ScaffoldInput = {
    config,
    manifests,
    blockSources: Object.freeze(blockSources) as BlockSourceMap,
    blockDefaultContent: Object.freeze(blockDefaultContent) as BlockDefaultContent,
    allPalettes,
  };

  const result = scaffold(input);

  if (!isOk(result)) {
    const errMsg = result.error.message;
    console.error(pc.red(`✗ Scaffold failed: ${errMsg}`));

    // Enhanced conflict messaging
    if ("blockA" in result.error && "blockB" in result.error) {
      const conflict = result.error as { blockA: string; blockB: string; reason?: string };
      console.error(pc.yellow(`  Block '${conflict.blockA}' conflicts with '${conflict.blockB}'.`));
      console.error(pc.dim("  Remove one of these blocks and try again."));
    }

    // Enhanced not-found messaging (network / registry)
    if ("blockName" in result.error) {
      const notFound = result.error as { blockName: string };
      console.error(pc.yellow(`  Block '${notFound.blockName}' was not found in the registry.`));
      console.error(pc.dim("  If you are offline, cached blocks will be used when available."));
      console.error(pc.dim("  Run 'fornix list' to see available blocks."));
    }

    process.exitCode = 1;
    return;
  }

  // ── Dry run: show file tree ──
  if (dryRun) {
    console.log(pc.bold("\n\ud83d\udccb Dry run \u2014 files that would be created:\n"));
    const sortedFiles = Object.keys(result.value.files).sort();
    for (const file of sortedFiles) {
      console.log(pc.dim("  ") + file);
    }
    console.log(pc.dim(`\n  Total: ${sortedFiles.length} files`));
    return;
  }

  // ── Write files to disk ──
  const files = result.value.files;
  let filesWritten = 0;

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(config.projectDir, relativePath);
    const parentDir = join(fullPath, "..");
    mkdirSync(parentDir, { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
    filesWritten++;

    if (verbose) {
      console.log(pc.dim(`  created ${relativePath}`));
    }
  }

  // ── Post-scaffold hooks: deps, git, CLAUDE.md, success message ──
  runPostScaffold({
    config,
    resolvedBlockNames: result.value.resolvedBlockNames,
    filesWritten,
    verbose,
    skipInstall,
    skipGit,
  });
}

// ── Provider Adapter ────────────────────────────────────

/**
 * Adapt a legacy provider (with Result-returning generate) to the
 * conversation module's AIProvider interface (with throwing generate).
 */
function adaptProvider(legacy: LegacyAIProvider): AIProvider {
  return {
    name: legacy.name,
    async generate<T extends z.ZodType>(options: {
      system: string;
      prompt: string;
      schema: T;
      maxTokens?: number;
    }): Promise<z.infer<T>> {
      const result = await legacy.generate(options.prompt);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return options.schema.parse(result.value) as z.infer<T>;
    },
    async *stream(): AsyncIterable<string> {
      yield "";
    },
  };
}

// ── Helpers ──────────────────────────────────────────────

function parseProviderName(value: unknown): ProviderName | undefined {
  if (!value || typeof value !== "string") return undefined;
  if (VALID_PROVIDER_NAMES.includes(value)) {
    return value as ProviderName;
  }
  return undefined;
}

async function getDescription(args: Record<string, unknown>): Promise<string | null> {
  if (args.yes) {
    return typeof args.description === "string" && args.description.length > 0
      ? args.description
      : DEFAULT_AI_DESCRIPTION;
  }

  p.intro(pc.bgCyan(pc.black(" Fornix \u2014 AI Mode ")));

  const input = await p.text({
    message: "Describe the website you want to build:",
    placeholder: "e.g., A fintech landing page with user authentication and a modern dark theme",
    validate(value) {
      if (!value.trim()) return "Please describe what you want to build";
      return undefined;
    },
  });

  if (p.isCancel(input)) {
    p.cancel("Operation cancelled.");
    return null;
  }

  return String(input);
}

function showAISummary(config: ResolvedConfig): void {
  const lines: string[] = [];

  lines.push(`${pc.bold("Project:")}      ${config.projectName}`);
  lines.push(`${pc.bold("Render mode:")}  ${config.renderMode}`);
  lines.push(`${pc.bold("Deploy to:")}    ${config.deployTarget}`);
  lines.push(`${pc.bold("CSS engine:")}   ${config.cssEngine}`);

  const blockNames = config.blocks.map((b) => b.name);
  lines.push(`${pc.bold("Blocks:")}       ${blockNames.length > 0 ? blockNames.join(", ") : pc.dim("(none)")}`);
  lines.push(`${pc.bold("Locales:")}      ${config.locales.join(", ")} (default: ${config.defaultLocale})`);

  if (config.palette.preset) {
    lines.push(`${pc.bold("Palette:")}      ${config.palette.preset}`);
  }

  if (config.themeSwitcher) {
    lines.push(`${pc.bold("Theme switcher:")} ${pc.green("yes")}`);
  }

  lines.push(`${pc.bold("Created with:")} ${pc.cyan("AI")}`);

  p.note(lines.join("\n"), "AI-Generated Configuration");
}

function showNoProviderGuide(): void {
  console.error(pc.red("\n\u2716 No AI provider found.\n"));
  console.error("To use AI mode, set up one of the following:\n");
  console.error(pc.bold("  Option 1: OpenAI"));
  console.error("    export OPENAI_API_KEY=sk-...\n");
  console.error(pc.bold("  Option 2: Ollama (free, local)"));
  console.error("    Install from https://ollama.com and run: ollama pull llama3.1\n");
  console.error(pc.bold("  Option 3: Cloudflare Workers AI"));
  console.error("    export CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...\n");
  console.error(pc.dim("  Or use manual mode: npx create-fornix --manual\n"));
}
