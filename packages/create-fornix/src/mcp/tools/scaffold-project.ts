import { mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { scaffold, type ScaffoldInput } from "../../scaffold/pipeline.js";
import type { ResolvedConfig } from "../../schemas/config.js";
import { loadAllPalettes } from "../../cli/fixture-registry.js";
import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { fetchBlocks } from "../../registry/block-fetcher.js";
import type { BlockSourceMap } from "../../scaffold/block-placer.js";
import type { BlockDefaultContent } from "../../scaffold/content-wiring.js";
import { ok, err, isOk, type Result } from "../../utils/result.js";

// ── Constants ───────────────────────────────────────────────

const DEFAULT_COLORS = {
  primary: "#6366f1",
  secondary: "#818cf8",
  accent: "#c084fc",
  background: "#0f172a",
  foreground: "#f8fafc",
};

// ── Input ───────────────────────────────────────────────────

export interface ScaffoldProjectInput {
  readonly description: string;
  readonly projectDirectory: string;
  readonly renderMode?: "static" | "hybrid" | "server";
  readonly deployTarget?: "cloudflare" | "vercel" | "netlify" | "static";
  readonly blocks?: ReadonlyArray<string>;
  readonly locales?: ReadonlyArray<string>;
}

// ── Output ──────────────────────────────────────────────────

export interface ScaffoldProjectOutput {
  readonly projectDirectory: string;
  readonly filesCreated: number;
  readonly blocks: ReadonlyArray<string>;
}

// ── Implementation ──────────────────────────────────────────

export async function scaffoldProject(
  input: ScaffoldProjectInput,
): Promise<Result<ScaffoldProjectOutput, Error>> {
  const {
    projectDirectory,
    renderMode = "static",
    deployTarget = "cloudflare",
    blocks = [],
    locales = ["en"],
  } = input;

  const registryResult = await fetchRegistryIndex();
  if (!isOk(registryResult)) {
    return err(new Error(`Failed to fetch block registry: ${registryResult.error.message}`));
  }
  const manifests = registryResult.value.blocks;
  const allPalettes = registryResult.value.palettes.length > 0 ? registryResult.value.palettes : loadAllPalettes();

  const projectName = basename(projectDirectory);
  const blockSelections = blocks.map((name) => ({ name, variant: "default" }));

  const config: ResolvedConfig = {
    projectName,
    projectDir: projectDirectory,
    renderMode,
    deployTarget,
    database: "none",
    cssEngine: "tailwind",
    packageManager: "pnpm",
    blocks: blockSelections,
    locales: locales.length > 0 ? [...locales] : ["en"],
    defaultLocale: locales[0] ?? "en",
    palette: {
      colors: { ...DEFAULT_COLORS },
    },
    themeSwitcher: false,
    createdWith: "mcp",
  };

  // Fetch blocks
  const blockResults = await fetchBlocks([...blocks]);
  const blockSources: Record<string, Record<string, string>> = {};
  const blockDefaultContent: Record<string, Record<string, unknown>> = {};

  for (const result of blockResults) {
    if (!isOk(result)) {
      return err(new Error(`Failed to fetch block '${result.error.blockName}': ${result.error.message}`));
    }
    const { manifest, files } = result.value;
    blockSources[manifest.name] = files;
    try {
      if (files["default-content.json"]) {
        blockDefaultContent[manifest.name] = JSON.parse(files["default-content.json"]);
      }
    } catch {
      // Ignored
    }
  }

  const scaffoldInput: ScaffoldInput = {
    config,
    manifests,
    blockSources: blockSources as BlockSourceMap,
    blockDefaultContent: blockDefaultContent as BlockDefaultContent,
    allPalettes,
  };

  const result = scaffold(scaffoldInput);
  if (!isOk(result)) {
    return err(result.error);
  }

  // Write files to disk
  const files = result.value.files;
  let filesCreated = 0;

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(projectDirectory, relativePath);
    const parentDirectory = join(fullPath, "..");
    mkdirSync(parentDirectory, { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
    filesCreated++;
  }

  return ok({
    projectDirectory,
    filesCreated,
    blocks: result.value.resolvedBlockNames,
  });
}
