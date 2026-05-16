import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Templates live alongside the scaffold source at compile time.
 * tsup copies them into `dist/templates/` at build time (see `tsup.config.ts`).
 *
 * At runtime, this resolves the templates directory relative to the running
 * module — so it works both in dev (loading from `src/templates/`) and in the
 * built CLI (loading from `dist/templates/`).
 */
const TEMPLATES_DIR_DEV = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "templates",
);
const TEMPLATES_DIR_DIST = join(
  dirname(fileURLToPath(import.meta.url)),
  "templates",
);

export type TemplateName =
  | "layout.astro"
  | "index.astro"
  | "astro.config.mjs"
  | "package.json"
  | "tsconfig.json"
  | "content.config.ts"
  | "gitignore"
  | "wrangler.json"
  | "site.config.ts"
  | "global.css";

export function loadTemplate(name: TemplateName): string {
  const filename = `${name}.template`;
  for (const base of [TEMPLATES_DIR_DEV, TEMPLATES_DIR_DIST]) {
    try {
      return readFileSync(join(base, filename), "utf8");
    } catch {
      // try next location
    }
  }
  throw new Error(
    `Template "${filename}" not found. Looked in:\n  - ${TEMPLATES_DIR_DEV}\n  - ${TEMPLATES_DIR_DIST}`,
  );
}

/**
 * Replace `{{key}}` placeholders. Missing keys throw — silent misspellings
 * have caused too many bugs.
 */
export function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) {
      throw new Error(
        `Template placeholder {{${key}}} has no value provided. Provided keys: ${Object.keys(values).join(", ")}`,
      );
    }
    return values[key];
  });
}
