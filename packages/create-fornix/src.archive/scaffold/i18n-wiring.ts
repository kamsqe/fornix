import type { ResolvedConfig } from "../schemas/config.js";
import type { BlockManifest } from "fornix-registry";
import type { FileMap } from "./structure-generator.js";
import { ok, type Result } from "../utils/result.js";

// ── Public API ───────────────────────────────────────────

/**
 * When `locales.length >= 2`, scaffolds i18n infrastructure:
 * - `src/i18n/utils.ts` with `getLocale()` and `t()` helpers
 * - `src/pages/[locale]/index.astro` for locale-prefixed routing
 *
 * Returns an empty FileMap for single-locale projects.
 */
export function wireI18n(
  config: ResolvedConfig,
  manifests?: ReadonlyArray<BlockManifest>,
): Result<FileMap, Error> {
  const files: FileMap = {};

  if (config.locales.length < 2) {
    return ok(files);
  }

  files["src/i18n/utils.ts"] = generateI18nUtils(config);
  files["src/pages/[locale]/index.astro"] = generateLocaleIndexPage(config, manifests ?? []);
  // Override the default index.astro with a redirect to the default locale
  files["src/pages/index.astro"] = generateRootRedirect(config);

  return ok(files);
}

// ── Root Redirect Generator ──────────────────────────────

function generateRootRedirect(config: ResolvedConfig): string {
  const needsPrerender = config.renderMode === "server" || config.renderMode === "hybrid";
  const prerenderLine = needsPrerender ? "export const prerender = true;\n" : "";

  return `---
${prerenderLine}return Astro.redirect("/${config.defaultLocale}/");
---
`;
}

// ── i18n Utils Generator ─────────────────────────────────

function generateI18nUtils(config: ResolvedConfig): string {
  const localesArray = config.locales
    .map((locale) => `"${locale}"`)
    .join(", ");

  return `export const locales = [${localesArray}] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "${config.defaultLocale}";

/**
 * Gets the current locale from the URL pathname.
 * Falls back to the default locale if not found.
 */
export function getLocale(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean);
  const candidate = segments[0];
  if (candidate && (locales as readonly string[]).includes(candidate)) {
    return candidate as Locale;
  }
  return defaultLocale;
}

/**
 * Simple translation lookup.
 * Given a translations record keyed by locale, returns the value
 * for the specified locale (or falls back to default).
 */
export function t<T>(
  translations: Record<Locale, T>,
  locale: Locale,
): T {
  return translations[locale] ?? translations[defaultLocale];
}
`;
}

// ── Locale Index Page Generator ──────────────────────────

function generateLocaleIndexPage(
  config: ResolvedConfig,
  manifests: ReadonlyArray<BlockManifest>,
): string {
  // Only content blocks — headers/footers live in Layout.astro (site-wide)
  const LAYOUT_CATEGORIES = new Set(["header", "footer"]);
  const contentBlocks = manifests.filter(
    (m) => m.type === "section" && !LAYOUT_CATEGORIES.has(m.category ?? ""),
  );

  const imports: string[] = [];
  const tags: string[] = [];

  for (const block of contentBlocks) {
    const componentName = block.name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    imports.push(`import ${componentName} from '../../components/sections/${block.name}.astro';`);
    tags.push(`    <${componentName} />`);
  }

  const importSection = imports.length > 0
    ? imports.join("\n") + "\n"
    : "";

  const blockSection = tags.length > 0
    ? "\n" + tags.join("\n") + "\n  "
    : "\n    <h1>" + config.projectName + "</h1>\n    <p>Locale: {locale}</p>\n  ";

  // In Astro v5 with output: "server", getStaticPaths requires prerender = true
  const needsPrerender = config.renderMode === "server" || config.renderMode === "hybrid";
  const prerenderLine = needsPrerender ? "export const prerender = true;\n" : "";

  return `---
import { locales } from "../../i18n/utils";
import Layout from "../../layouts/Layout.astro";
${importSection}${prerenderLine}
export function getStaticPaths() {
  return locales.map((locale: string) => ({ params: { locale } }));
}

const { locale } = Astro.params;
---
<Layout title="${config.projectName}">
  <main>${blockSection}</main>
</Layout>
`;
}

