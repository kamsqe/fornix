import type { BlockManifest, Palette } from "fornix-registry";
import type { ResolvedConfig } from "../schemas/config.js";
import type { FileMap } from "./structure-generator.js";
import type { BlockSourceMap } from "./block-placer.js";
import type { BlockDefaultContent } from "./content-wiring.js";
import { ok, err, isOk, type Result } from "../utils/result.js";
import { validateConfig } from "./config-validator.js";
import { resolveDependencies } from "./dependency-resolver.js";
import { generateStructure } from "./structure-generator.js";
import { generateAstroConfig } from "./config-generators/astro-config.js";
import { generateTailwindConfig } from "./config-generators/tailwind-config.js";
import { generatePaletteCSS } from "./config-generators/palette-css.js";
import { placeBlocks } from "./block-placer.js";
import { wireContent } from "./content-wiring.js";
import { wireI18n } from "./i18n-wiring.js";
import { generateAgentContext } from "./agent-context-generator.js";

// ── Types ────────────────────────────────────────────────

export interface ScaffoldInput {
  readonly config: ResolvedConfig;
  readonly manifests: Readonly<Record<string, BlockManifest>>;
  readonly blockSources: BlockSourceMap;
  readonly blockDefaultContent: BlockDefaultContent;
  readonly allPalettes: ReadonlyArray<Palette>;
}

export interface ScaffoldResult {
  readonly files: FileMap;
  readonly resolvedBlockNames: ReadonlyArray<string>;
}

// ── Public API ───────────────────────────────────────────

/**
 * Full scaffold pipeline: validates config, resolves dependencies,
 * generates project structure, config files, places blocks,
 * wires content and i18n, generates .env.example, and writes fornix.json.
 *
 * Pure function: config in → files out. No side effects.
 */
export function scaffold(
  input: ScaffoldInput,
): Result<ScaffoldResult, Error> {
  const { config, manifests, blockSources, blockDefaultContent, allPalettes } = input;

  // 1. Validate config
  const validationResult = validateConfig(config, manifests);
  if (!isOk(validationResult)) {
    const messages = validationResult.error
      .map((validationError) => validationError.message)
      .join("; ");
    return err(new Error(`Config validation failed: ${messages}`));
  }

  // 2. Resolve dependencies
  const selectedBlockNames = config.blocks.map((block) => block.name);
  const dependencyResult = resolveDependencies(selectedBlockNames, manifests);
  if (!isOk(dependencyResult)) {
    return err(Object.assign(new Error(dependencyResult.error.message), dependencyResult.error));
  }
  const resolvedBlockNames = dependencyResult.value;

  // 3. Generate base structure
  const files: FileMap = {};

  // 4. Resolve block manifests
  const resolvedManifests = resolvedBlockNames
    .filter((name) => manifests[name] !== undefined)
    .map((name) => manifests[name]);

  const structureFiles = generateStructure(config, resolvedManifests);
  Object.assign(files, structureFiles);



  // 5. Generate astro.config.mjs
  const astroConfigResult = generateAstroConfig(config, resolvedManifests);
  if (!isOk(astroConfigResult)) {
    return err(astroConfigResult.error);
  }
  files["astro.config.mjs"] = astroConfigResult.value;

  // 5. Generate tailwind config
  const tailwindResult = generateTailwindConfig(config);
  if (!isOk(tailwindResult)) {
    return err(tailwindResult.error);
  }
  if (tailwindResult.value !== null) {
    files["tailwind.css"] = tailwindResult.value;
  }

  // 6. Generate palette CSS
  const paletteResult = generatePaletteCSS(
    config.palette,
    config.themeSwitcher,
    allPalettes.length > 0 ? allPalettes : undefined,
  );
  if (!isOk(paletteResult)) {
    return err(paletteResult.error);
  }
  Object.assign(files, paletteResult.value.files);
  if (paletteResult.value.switcherScript) {
    files["src/scripts/theme-switcher.js"] = paletteResult.value.switcherScript;
  }

  // 7. Place block files

  const blockPlaceResult = placeBlocks(resolvedManifests, blockSources, config);
  if (!isOk(blockPlaceResult)) {
    return err(blockPlaceResult.error);
  }
  Object.assign(files, blockPlaceResult.value);

  // 8. Wire content collections
  const contentResult = wireContent(resolvedManifests, blockDefaultContent, config);
  if (!isOk(contentResult)) {
    return err(contentResult.error);
  }
  Object.assign(files, contentResult.value);

  // 9. Wire i18n
  const i18nResult = wireI18n(config);
  if (!isOk(i18nResult)) {
    return err(i18nResult.error);
  }
  Object.assign(files, i18nResult.value);

  // 10. Generate .env.example
  const envVars = collectEnvVars(resolvedManifests);
  if (envVars.length > 0) {
    files[".env.example"] = generateEnvExample(envVars);
  }

  // 11. Write fornix.json (ProjectManifest)
  files["fornix.json"] = generateProjectManifest(config, resolvedManifests);

  // 12. Generate Agent Context (CLAUDE.md and .cursor/rules/fornix.mdc)
  const agentContextFiles = generateAgentContext(config, resolvedManifests);
  Object.assign(files, agentContextFiles);

  return ok({ files, resolvedBlockNames });
}

// ── .env.example Generator ───────────────────────────────

interface EnvVarEntry {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
  readonly blockName: string;
}

function collectEnvVars(
  blocks: ReadonlyArray<BlockManifest>,
): EnvVarEntry[] {
  const entries: EnvVarEntry[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    for (const envVar of block.envVars) {
      if (!seen.has(envVar.name)) {
        seen.add(envVar.name);
        entries.push({
          name: envVar.name,
          description: envVar.description,
          required: envVar.required,
          blockName: block.name,
        });
      }
    }
  }

  return entries;
}

function generateEnvExample(envVars: ReadonlyArray<EnvVarEntry>): string {
  const lines: string[] = [
    "# Environment Variables",
    "# Generated by Fornix — fill in your values",
    "",
  ];

  for (const envVar of envVars) {
    lines.push(`# ${envVar.description} (from ${envVar.blockName})`);
    lines.push(`${envVar.name}=`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Project Manifest Generator ───────────────────────────

function generateProjectManifest(
  config: ResolvedConfig,
  blocks: ReadonlyArray<BlockManifest>,
): string {
  const now = new Date().toISOString();

  const manifest = {
    version: "1.0.0",
    createdAt: now,
    createdWith: config.createdWith,
    renderMode: config.renderMode,
    deployTarget: config.deployTarget,
    database: config.database,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    palette: config.palette,
    themeSwitcher: config.themeSwitcher,
    blocks: blocks.map((block) => ({
      name: block.name,
      version: block.version,
      variant: config.blocks.find((selection) => selection.name === block.name)?.variant ?? "default",
      installedAt: now,
    })),
  };

  return JSON.stringify(manifest, null, 2) + "\n";
}
