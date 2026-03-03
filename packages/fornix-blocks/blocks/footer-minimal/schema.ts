import { z } from "astro:content";

/**
 * Content collection schema for the footer-minimal section block.
 * All visible text is sourced from the content collection — never hardcoded.
 */
export const footerMinimalSchema = z.object({
  copyright: z.string().max(100),
  tagline: z.string().max(120).optional().default(""),
  links: z.array(
    z.object({
      label: z.string(),
      href: z.string(),
    })
  ).optional().default([]),
});

export type FooterMinimalContent = z.infer<typeof footerMinimalSchema>;
