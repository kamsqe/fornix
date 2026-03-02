import type { ResolvedConfig } from "../schemas/config.js";
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
): Result<FileMap, Error> {
  const files: FileMap = {};

  if (config.locales.length < 2) {
    return ok(files);
  }

  files["src/i18n/utils.ts"] = generateI18nUtils(config);
  files["src/pages/[locale]/index.astro"] = generateLocaleIndexPage(config);

  return ok(files);
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

function generateLocaleIndexPage(config: ResolvedConfig): string {
  return `---
import { locales } from "../../i18n/utils";
import Layout from "../../layouts/Layout.astro";

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

const { locale } = Astro.params;
---
<Layout title="${config.projectName}">
  <main>
    <h1>${config.projectName}</h1>
    <p>Locale: {locale}</p>
  </main>
</Layout>
`;
}
