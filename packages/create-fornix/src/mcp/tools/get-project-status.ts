import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ok, err, type Result } from "../../utils/result.js";

// ── Input ───────────────────────────────────────────────────

export interface GetProjectStatusInput {
  readonly projectDirectory: string;
}

// ── Output ──────────────────────────────────────────────────

export interface ProjectStatusOutput {
  readonly version: string;
  readonly createdAt: string;
  readonly createdWith: string;
  readonly renderMode: string;
  readonly deployTarget: string;
  readonly database: string;
  readonly locales: ReadonlyArray<string>;
  readonly defaultLocale: string;
  readonly palette: unknown;
  readonly themeSwitcher: boolean;
  readonly blocks: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
    readonly variant: string;
    readonly installedAt: string;
  }>;
}

// ── Implementation ──────────────────────────────────────────

export function getProjectStatus(
  input: GetProjectStatusInput,
): Result<ProjectStatusOutput, Error> {
  const manifestPath = join(input.projectDirectory, "fornix.json");

  if (!existsSync(manifestPath)) {
    return err(
      new Error("No fornix.json found. Not a Fornix project directory."),
    );
  }

  try {
    const raw = readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw) as Record<string, unknown>;

    const blocks = manifest.blocks as Array<{
      name: string;
      version: string;
      variant: string;
      installedAt: string;
    }>;

    return ok({
      version: manifest.version as string,
      createdAt: manifest.createdAt as string,
      createdWith: manifest.createdWith as string,
      renderMode: manifest.renderMode as string,
      deployTarget: manifest.deployTarget as string,
      database: (manifest.database as string) ?? "none",
      locales: (manifest.locales as string[]) ?? ["en"],
      defaultLocale: (manifest.defaultLocale as string) ?? "en",
      palette: manifest.palette,
      themeSwitcher: (manifest.themeSwitcher as boolean) ?? false,
      blocks: blocks ?? [],
    });
  } catch {
    return err(new Error("Failed to parse fornix.json."));
  }
}
