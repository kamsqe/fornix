import { defineCommand } from "citty";
import { resolve, basename } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scaffold, type ScaffoldInput } from "../../scaffold/pipeline.js";
import { isOk } from "../../utils/result.js";
import type { ResolvedConfig } from "../../schemas/config.js";
import {
  FIXTURE_MANIFESTS,
  FIXTURE_BLOCK_SOURCES,
  FIXTURE_DEFAULT_CONTENT,
  loadAllPalettes,
} from "../fixture-registry.js";
import pc from "picocolors";

// ── Default Palette Colors ──────────────────────────────

const DEFAULT_COLORS = {
  primary: "#6366f1",
  secondary: "#818cf8",
  accent: "#c084fc",
  background: "#0f172a",
  foreground: "#f8fafc",
};

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
    // ── Resolve project directory ──
    const projectDir = resolve(args.dir ?? ".");
    const projectName = basename(projectDir);

    // ── Parse flags into ResolvedConfig ──
    const renderMode = (args.render ?? "static") as "static" | "hybrid" | "server";
    const deployTarget = (args.deploy ?? "cloudflare") as "cloudflare" | "vercel" | "netlify" | "static";
    const database = (args.database ?? "none") as "none" | "d1" | "turso" | "astro-db" | "postgres";
    const cssEngine = (args.css ?? "tailwind") as "tailwind" | "vanilla";
    const localesRaw = args.locales ?? "en";
    const locales = localesRaw.split(",").map((l) => l.trim()).filter(Boolean);
    const defaultLocale = locales[0] ?? "en";
    const themeSwitcher = args["theme-switcher"] ?? false;

    // Parse blocks
    const blockNames = args.blocks
      ? args.blocks.split(",").map((b) => b.trim()).filter(Boolean)
      : [];
    const blocks = blockNames.map((name) => ({ name, variant: "default" }));

    // Resolve palette
    const allPalettes = loadAllPalettes();
    let paletteColors = { ...DEFAULT_COLORS };
    let palettePreset: string | undefined;

    if (args.palette) {
      const found = allPalettes.find((p) => p.name === args.palette);
      if (found) {
        paletteColors = { ...found.colors };
        palettePreset = found.name;
      } else {
        console.error(pc.red(`✖ Palette "${args.palette}" not found in registry.`));
        console.error(pc.dim(`  Available: ${allPalettes.map((p) => p.name).join(", ")}`));
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
      createdWith: "manual",
    } as ResolvedConfig;

    // ── Build scaffold input ──
    const input: ScaffoldInput = {
      config,
      manifests: FIXTURE_MANIFESTS,
      blockSources: FIXTURE_BLOCK_SOURCES,
      blockDefaultContent: FIXTURE_DEFAULT_CONTENT,
      allPalettes,
    };

    // ── Run scaffold pipeline ──
    const result = scaffold(input);

    if (!isOk(result)) {
      console.error(pc.red(`✖ Scaffold failed: ${result.error.message}`));
      process.exitCode = 1;
      return;
    }

    // ── Dry run: show file tree ──
    if (args["dry-run"]) {
      console.log(pc.bold("\n📋 Dry run — files that would be created:\n"));
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
      const fullPath = join(projectDir, relativePath);
      const parentDir = join(fullPath, "..");
      mkdirSync(parentDir, { recursive: true });
      writeFileSync(fullPath, content, "utf-8");
      filesWritten++;

      if (args.verbose) {
        console.log(pc.dim(`  created ${relativePath}`));
      }
    }

    // ── Success message ──
    console.log("");
    console.log(pc.green(pc.bold("✔ Project created successfully!")));
    console.log("");
    console.log(`  ${pc.bold("Project:")}  ${projectName}`);
    console.log(`  ${pc.bold("Dir:")}      ${projectDir}`);
    console.log(`  ${pc.bold("Render:")}   ${renderMode}`);
    console.log(`  ${pc.bold("Deploy:")}   ${deployTarget}`);
    console.log(`  ${pc.bold("CSS:")}      ${cssEngine}`);
    if (blocks.length > 0) {
      console.log(`  ${pc.bold("Blocks:")}   ${result.value.resolvedBlockNames.join(", ")}`);
    }
    if (locales.length > 1) {
      console.log(`  ${pc.bold("Locales:")}  ${locales.join(", ")} (default: ${defaultLocale})`);
    }
    if (palettePreset) {
      console.log(`  ${pc.bold("Palette:")}  ${palettePreset}`);
    }
    console.log(`  ${pc.bold("Files:")}    ${filesWritten} files written`);
    console.log("");
    console.log(pc.dim("  Next steps:"));
    console.log(pc.dim(`    cd ${projectName}`));
    console.log(pc.dim("    pnpm install"));
    console.log(pc.dim("    pnpm dev"));
    console.log("");
  },
});
