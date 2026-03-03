import { z } from "astro:content";

/**
 * Content collection schema for the theme-switcher block.
 */
export const themeSwitcherSchema = z.object({
  label: z.string().max(30).optional().default("Theme"),
});

export type ThemeSwitcherContent = z.infer<typeof themeSwitcherSchema>;
