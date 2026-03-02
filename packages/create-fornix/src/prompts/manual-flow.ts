/**
 * Interactive manual prompt flow using @clack/prompts.
 *
 * Prompt sequence:
 *   1. Project name
 *   2. Render mode
 *   3. Deploy target
 *   4. CSS engine
 *   5. Block selection (categorized)
 *   6. Locale selection
 *   7. Palette selection (browse pre-built, grouped by category)
 *   8. Theme switcher toggle
 *   9. Confirmation summary
 *
 * Output: ResolvedConfig (or null if cancelled)
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import type { ResolvedConfig } from "../schemas/config.js";
import type { BlockManifest, Palette } from "fornix-registry";

// ── Types ───────────────────────────────────────────────

export interface ManualFlowInput {
  readonly defaultProjectName: string;
  readonly manifests: Readonly<Record<string, BlockManifest>>;
  readonly allPalettes: ReadonlyArray<Palette>;
}

// ── Public API ──────────────────────────────────────────

export async function runManualFlow(
  input: ManualFlowInput,
): Promise<ResolvedConfig | null> {
  p.intro(pc.bgCyan(pc.black(" Fornix — Create your project ")));

  // 1. Project name
  const projectName = await p.text({
    message: "What is your project name?",
    placeholder: input.defaultProjectName,
    defaultValue: input.defaultProjectName,
    validate(value) {
      if (!value.trim()) return "Project name is required";
      if (!/^[a-z0-9-]+$/i.test(value.trim())) {
        return "Project name must only contain letters, numbers, and dashes";
      }
      return undefined;
    },
  });
  if (p.isCancel(projectName)) return handleCancel();

  // 2. Render mode
  const renderMode = await p.select({
    message: "Choose a render mode",
    options: [
      { value: "static", label: "Static (SSG)", hint: "Pre-built HTML, fastest" },
      { value: "hybrid", label: "Hybrid", hint: "Static by default, opt into SSR per page" },
      { value: "server", label: "Server (SSR)", hint: "Server-rendered on every request" },
    ],
  });
  if (p.isCancel(renderMode)) return handleCancel();

  // 3. Deploy target
  const deployTarget = await p.select({
    message: "Where will you deploy?",
    options: [
      { value: "cloudflare", label: "Cloudflare Pages", hint: "Recommended" },
      { value: "vercel", label: "Vercel" },
      { value: "netlify", label: "Netlify" },
      { value: "static", label: "Static hosting", hint: "No adapter needed" },
    ],
  });
  if (p.isCancel(deployTarget)) return handleCancel();

  // 4. CSS engine
  const cssEngine = await p.select({
    message: "Choose a CSS engine",
    options: [
      { value: "tailwind", label: "Tailwind CSS v4", hint: "Recommended" },
      { value: "vanilla", label: "Vanilla CSS", hint: "No framework" },
    ],
  });
  if (p.isCancel(cssEngine)) return handleCancel();

  // 5. Block selection (categorized)
  const blockOptions = buildBlockOptions(input.manifests);
  let selectedBlocks: string[] = [];

  if (blockOptions.length > 0) {
    const blocks = await p.multiselect({
      message: "Select blocks to include (space to toggle, enter to confirm)",
      options: blockOptions,
      required: false,
    });
    if (p.isCancel(blocks)) return handleCancel();
    selectedBlocks = blocks as string[];
  }

  // 6. Locales
  const localesInput = await p.text({
    message: "Locales (comma-separated, e.g. en,es,ar)",
    placeholder: "en",
    defaultValue: "en",
  });
  if (p.isCancel(localesInput)) return handleCancel();

  const locales = (localesInput as string)
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  const defaultLocale = locales[0] ?? "en";

  // 7. Palette selection (grouped by category)
  const paletteOptions = buildPaletteOptions(input.allPalettes);
  let selectedPalette: Palette | undefined;

  if (paletteOptions.length > 0) {
    const paletteChoice = await p.select({
      message: "Choose a color palette",
      options: paletteOptions,
    });
    if (p.isCancel(paletteChoice)) return handleCancel();

    selectedPalette = input.allPalettes.find((pal) => pal.name === paletteChoice);
  }

  // 8. Theme switcher toggle
  const themeSwitcher = await p.confirm({
    message: "Enable theme switcher? (allows users to change palettes at runtime)",
    initialValue: false,
  });
  if (p.isCancel(themeSwitcher)) return handleCancel();

  // ── Build ResolvedConfig ──
  const config: ResolvedConfig = {
    projectName: (projectName as string).trim(),
    projectDir: `./${(projectName as string).trim()}`,
    renderMode: renderMode as "static" | "hybrid" | "server",
    deployTarget: deployTarget as "cloudflare" | "vercel" | "netlify" | "static",
    database: "none",
    cssEngine: cssEngine as "tailwind" | "vanilla",
    packageManager: "pnpm",
    blocks: selectedBlocks.map((name) => ({ name, variant: "default" })),
    locales,
    defaultLocale,
    palette: {
      ...(selectedPalette ? { preset: selectedPalette.name } : {}),
      colors: selectedPalette?.colors ?? {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    },
    themeSwitcher: themeSwitcher as boolean,
    createdWith: "manual",
  } as ResolvedConfig;

  // 9. Confirmation summary
  p.note(
    buildSummary(config, selectedBlocks, selectedPalette),
    "Project Summary",
  );

  const confirmed = await p.confirm({
    message: "Create this project?",
    initialValue: true,
  });
  if (p.isCancel(confirmed) || !confirmed) return handleCancel();

  return config;
}

// ── Helpers ─────────────────────────────────────────────

function handleCancel(): null {
  p.cancel("Operation cancelled.");
  return null;
}

function buildBlockOptions(
  manifests: Readonly<Record<string, BlockManifest>>,
): Array<{ value: string; label: string; hint?: string }> {
  const blocks = Object.values(manifests);

  // Group by category
  const categories = new Map<string, BlockManifest[]>();
  for (const block of blocks) {
    const category = block.category ?? "other";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(block);
  }

  // Build flat options with category hints
  const options: Array<{ value: string; label: string; hint?: string }> = [];

  for (const [category, categoryBlocks] of categories) {
    for (const block of categoryBlocks) {
      options.push({
        value: block.name,
        label: `${block.name}`,
        hint: `${category} — ${block.description}`,
      });
    }
  }

  return options;
}

function buildPaletteOptions(
  palettes: ReadonlyArray<Palette>,
): Array<{ value: string; label: string; hint?: string }> {
  if (palettes.length === 0) return [];

  // Group by category
  const categories = new Map<string, Palette[]>();
  for (const palette of palettes) {
    const category = palette.category ?? "other";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(palette);
  }

  // Build flat options with color preview swatches
  const options: Array<{ value: string; label: string; hint?: string }> = [];

  for (const [category, categoryPalettes] of categories) {
    for (const palette of categoryPalettes) {
      const modeLabel = palette.mode === "dark" ? "🌙" : "☀️";
      options.push({
        value: palette.name,
        label: `${modeLabel} ${palette.displayName}`,
        hint: `${category} — ${palette.colors.primary}`,
      });
    }
  }

  return options;
}

function buildSummary(
  config: ResolvedConfig,
  blockNames: ReadonlyArray<string>,
  palette: Palette | undefined,
): string {
  const lines: string[] = [];

  lines.push(`${pc.bold("Project:")}      ${config.projectName}`);
  lines.push(`${pc.bold("Render mode:")}  ${config.renderMode}`);
  lines.push(`${pc.bold("Deploy to:")}    ${config.deployTarget}`);
  lines.push(`${pc.bold("CSS engine:")}   ${config.cssEngine}`);

  if (blockNames.length > 0) {
    lines.push(`${pc.bold("Blocks:")}       ${blockNames.join(", ")}`);
  } else {
    lines.push(`${pc.bold("Blocks:")}       ${pc.dim("(none)")}`);
  }

  lines.push(`${pc.bold("Locales:")}      ${config.locales.join(", ")} (default: ${config.defaultLocale})`);

  if (palette) {
    lines.push(`${pc.bold("Palette:")}      ${palette.displayName} (${palette.mode})`);
  } else {
    lines.push(`${pc.bold("Palette:")}      ${pc.dim("default")}`);
  }

  lines.push(`${pc.bold("Theme switcher:")} ${config.themeSwitcher ? pc.green("yes") : pc.dim("no")}`);

  return lines.join("\n");
}
