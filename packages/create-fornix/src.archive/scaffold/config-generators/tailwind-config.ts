import type { ResolvedConfig } from "../../schemas/config.js";
import { ok, type Result } from "../../utils/result.js";

// ── Public API ───────────────────────────────────────────

/**
 * Generates the Tailwind CSS v4 config file (CSS-based with @theme).
 * Returns null when cssEngine is not 'tailwind'.
 */
export function generateTailwindConfig(
  config: ResolvedConfig,
): Result<string | null, Error> {
  if (config.cssEngine !== "tailwind") {
    return ok(null);
  }

  const lines = [
    '@import "tailwindcss";',
    '@import "./src/styles/palettes/_current.css";',
    "",
    `@source "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}";`,
    "",
  ];

  return ok(lines.join("\n"));
}
