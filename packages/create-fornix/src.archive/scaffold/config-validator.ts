import type { BlockManifest } from "fornix-registry";
import type { ResolvedConfig } from "../schemas/config.js";
import { ok, err, type Result } from "../utils/result.js";

// ── Validation Error ──────────────────────────────────────

export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

// ── Public API ────────────────────────────────────────────

export function validateConfig(
  config: ResolvedConfig,
  manifests: Readonly<Record<string, BlockManifest>>
): Result<ResolvedConfig, ValidationError[]> {
  const errors: ValidationError[] = [];

  checkBlocksExist(config, manifests, errors);
  checkRequiredModes(config, manifests, errors);
  checkDatabaseRequiresServer(config, errors);
  checkDefaultLocaleInLocales(config, errors);
  checkServerDeployTarget(config, errors);

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(config);
}

// ── Individual Checks ─────────────────────────────────────

function checkBlocksExist(
  config: ResolvedConfig,
  manifests: Readonly<Record<string, BlockManifest>>,
  errors: ValidationError[]
): void {
  for (const block of config.blocks) {
    if (!(block.name in manifests)) {
      errors.push({
        field: "blocks",
        message: `Block '${block.name}' not found in registry`,
      });
    }
  }
}

function checkRequiredModes(
  config: ResolvedConfig,
  manifests: Readonly<Record<string, BlockManifest>>,
  errors: ValidationError[]
): void {
  if (config.renderMode === "static") {
    for (const block of config.blocks) {
      const manifest = manifests[block.name];
      if (manifest?.requiredMode === "server" || manifest?.requiredMode === "hybrid") {
        errors.push({
          field: "blocks",
          message: `Block '${block.name}' requires '${manifest.requiredMode}' rendering, but config uses 'static' mode`,
        });
      }
    }
  }
}

function checkDatabaseRequiresServer(
  config: ResolvedConfig,
  errors: ValidationError[]
): void {
  if (config.database !== "none" && config.renderMode === "static") {
    errors.push({
      field: "database",
      message: `Database '${config.database}' requires server or hybrid rendering, but config uses 'static' mode`,
    });
  }
}

function checkDefaultLocaleInLocales(
  config: ResolvedConfig,
  errors: ValidationError[]
): void {
  if (!config.locales.includes(config.defaultLocale)) {
    errors.push({
      field: "defaultLocale",
      message: `defaultLocale '${config.defaultLocale}' is not in the locales array [${config.locales.join(", ")}]`,
    });
  }
}

function checkServerDeployTarget(
  config: ResolvedConfig,
  errors: ValidationError[]
): void {
  if (
    (config.renderMode === "server" || config.renderMode === "hybrid") &&
    config.deployTarget === "static"
  ) {
    errors.push({
      field: "deployTarget",
      message: `Deploy target 'static' is not compatible with render mode '${config.renderMode}'. Use a server-capable deploy target (cloudflare, vercel, netlify) or switch to render mode 'static'.`,
    });
  }
}
