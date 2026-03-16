export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

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
