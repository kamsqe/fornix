import { mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { scaffold, type ScaffoldInput } from "../../scaffold/pipeline.js";
import type { ResolvedConfig } from "../../schemas/config.js";
import {
  FIXTURE_MANIFESTS,
  FIXTURE_BLOCK_SOURCES,
  FIXTURE_DEFAULT_CONTENT,
  loadAllPalettes,
} from "../../cli/fixture-registry.js";
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

export function scaffoldProject(
  input: ScaffoldProjectInput,
): Result<ScaffoldProjectOutput, Error> {
  const {
    projectDirectory,
    renderMode = "static",
    deployTarget = "cloudflare",
    blocks = [],
    locales = ["en"],
  } = input;

  const projectName = basename(projectDirectory);
  const blockSelections = blocks.map((name) => ({ name, variant: "default" }));
  const allPalettes = loadAllPalettes();

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

  const scaffoldInput: ScaffoldInput = {
    config,
    manifests: FIXTURE_MANIFESTS,
    blockSources: FIXTURE_BLOCK_SOURCES,
    blockDefaultContent: FIXTURE_DEFAULT_CONTENT,
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
