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
import { resolveDependencies } from "../scaffold/dependency-resolver.js";
import { isOk } from "../utils/result.js";
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
      { value: "hybrid", label: "Hybrid", hint: "Static + per-page SSR opt-in" },
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

  // 5. Block selection — split by category for single-select header/footer
  const headerOptions = buildCategoryOptions(input.manifests, "header");
  const footerOptions = buildCategoryOptions(input.manifests, "footer");
  const contentOptions = buildContentBlockOptions(input.manifests);

  let selectedHeader: string | undefined;
  let selectedFooter: string | undefined;
  let selectedContentBlocks: string[] = [];

  while (true) {
    selectedHeader = undefined;
    selectedFooter = undefined;
    selectedContentBlocks = [];

    // 5a. Header selection (single-select, optional)
    if (headerOptions.length > 0) {
      const noneOption = { value: "__none__", label: "None", hint: "No header" };
      const headerChoice = await p.select({
        message: "Choose a header (appears on every page)",
        options: [noneOption, ...headerOptions],
      });
      if (p.isCancel(headerChoice)) return handleCancel();
      if (headerChoice !== "__none__") selectedHeader = headerChoice as string;
    }

    // 5b. Content blocks (multi-select)
    if (contentOptions.length > 0) {
      const blocks = await p.multiselect({
        message: "Select content blocks (space to toggle, enter to confirm)",
        options: contentOptions,
        required: false,
      });
      if (p.isCancel(blocks)) return handleCancel();
      selectedContentBlocks = blocks as string[];
    }

    // 5c. Footer selection (single-select, optional)
    if (footerOptions.length > 0) {
      const noneOption = { value: "__none__", label: "None", hint: "No footer" };
      const footerChoice = await p.select({
        message: "Choose a footer (appears on every page)",
        options: [noneOption, ...footerOptions],
      });
      if (p.isCancel(footerChoice)) return handleCancel();
      if (footerChoice !== "__none__") selectedFooter = footerChoice as string;
    }

    // Check for conflicts
    const tempSelected: string[] = [];
    if (selectedHeader) tempSelected.push(selectedHeader);
    tempSelected.push(...selectedContentBlocks);
    if (selectedFooter) tempSelected.push(selectedFooter);

    if (tempSelected.length > 0) {
      const checkResult = resolveDependencies(tempSelected, input.manifests);
      if (!isOk(checkResult)) {
        if (checkResult.error.kind === "DependencyConflictError") {
          p.log.warn(`Conflict detected: ${checkResult.error.blockA} conflicts with ${checkResult.error.blockB}`);
          const retry = await p.confirm({
            message: "Block conflict detected. Would you like to select your blocks again?",
            initialValue: true,
          });
          if (p.isCancel(retry) || !retry) return handleCancel();
          continue; // Restart the loop
        }
      }
    }
    
    // No conflicts or user didn't pick any blocks
    break;
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

  // 7. Palette selection (grouped by category with separators)
  const paletteOptions = buildPaletteOptions(input.allPalettes);
  let selectedPalette: Palette | undefined;

  if (paletteOptions.length > 0) {
    const paletteChoice = await p.select({
      message: "Choose a default color palette",
      options: paletteOptions,
    });
    if (p.isCancel(paletteChoice)) return handleCancel();

    selectedPalette = input.allPalettes.find((pal) => pal.name === paletteChoice);
  }

  // 8. Theme switcher toggle (only if 2+ palettes available)
  let themeSwitcher = false;
  if (input.allPalettes.length >= 2) {
    const paletteCount = input.allPalettes.length;
    const switcherChoice = await p.confirm({
      message: `Enable theme switcher? (includes all ${paletteCount} registry palettes for runtime switching)`,
      initialValue: false,
    });
    if (p.isCancel(switcherChoice)) return handleCancel();
    themeSwitcher = switcherChoice as boolean;
  }

  // 8b. Auto-suggest header when i18n or theme-switcher needs navigation
  if (!selectedHeader && headerOptions.length > 0) {
    const needsNav = locales.length >= 2 || themeSwitcher;
    if (needsNav) {
      const autoHeader = await p.confirm({
        message: `You enabled ${locales.length >= 2 ? "multiple locales" : "theme switching"} — add a header for navigation?`,
        initialValue: true,
      });
      if (p.isCancel(autoHeader)) return handleCancel();
      if (autoHeader) {
        // Default to first available header
        selectedHeader = headerOptions[0].value as string;
        console.log(pc.dim(`  Adding ${selectedHeader} for navigation.`));
      }
    }
  }

  // ── Assemble selected blocks ──
  const selectedBlocks: string[] = [];
  if (selectedHeader) selectedBlocks.push(selectedHeader);
  selectedBlocks.push(...selectedContentBlocks);
  if (selectedFooter) selectedBlocks.push(selectedFooter);

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
    themeSwitcher,
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

/**
 * Builds options for a single category (e.g. "header" or "footer").
 * Used for single-select prompts.
 */
function buildCategoryOptions(
  manifests: Readonly<Record<string, BlockManifest>>,
  category: string,
): Array<{ value: string; label: string; hint?: string }> {
  return Object.values(manifests)
    .filter((block) => (block.category ?? "other") === category)
    .map((block) => ({
      value: block.name,
      label: block.name,
      hint: block.description,
    }));
}

/**
 * Builds options for content blocks (everything except header/footer).
 * Used for multi-select prompt.
 */
function buildContentBlockOptions(
  manifests: Readonly<Record<string, BlockManifest>>,
): Array<{ value: string; label: string; hint?: string }> {
  const LAYOUT_CATEGORIES = new Set(["header", "footer"]);
  const blocks = Object.values(manifests).filter(
    (block) => !LAYOUT_CATEGORIES.has(block.category ?? "other"),
  );

  // Group by category
  const categories = new Map<string, BlockManifest[]>();
  for (const block of blocks) {
    const category = block.category ?? "other";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(block);
  }

  const options: Array<{ value: string; label: string; hint?: string }> = [];
  for (const [category, categoryBlocks] of categories) {
    for (const block of categoryBlocks) {
      options.push({
        value: block.name,
        label: block.name,
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

  // Sort palettes by category (alphabetical), then by display name within each category
  const sorted = [...palettes].sort((a, b) => {
    const catA = a.category ?? "other";
    const catB = b.category ?? "other";
    if (catA !== catB) return catA.localeCompare(catB);
    return a.displayName.localeCompare(b.displayName);
  });

  // Build options — category shown in hint, mode emoji in label
  return sorted.map((palette) => {
    const modeLabel = palette.mode === "dark" ? "🌙" : "☀️";
    const category = palette.category ?? "other";
    return {
      value: palette.name,
      label: `${modeLabel} ${palette.displayName}`,
      hint: `${category} · ${palette.colors.primary}`,
    };
  });
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

  if (config.themeSwitcher) {
    lines.push(`${pc.bold("Theme switcher:")} ${pc.green("yes")} (all registry palettes included)`);
  } else {
    lines.push(`${pc.bold("Theme switcher:")} ${pc.dim("no")}`);
  }

  return lines.join("\n");
}
