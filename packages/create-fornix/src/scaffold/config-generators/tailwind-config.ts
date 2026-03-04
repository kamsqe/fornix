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

  const themeBlock = [
    "@theme {",
    "  --color-primary: var(--color-primary);",
    "  --color-secondary: var(--color-secondary);",
    "  --color-accent: var(--color-accent);",
    "  --color-background: var(--color-background);",
    "  --color-foreground: var(--color-foreground);",
    "}",
  ].join("\n");

  const lines = [
    '@import "tailwindcss";',
    '@import "./src/styles/palettes/_current.css";',
    "",
    `@source "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}";`,
    "",
    themeBlock,
    "",
  ];

  return ok(lines.join("\n"));
}
