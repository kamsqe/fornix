import { z } from "astro:content";

/**
 * Content collection schema for the hero-gradient section block.
 * All visible text is sourced from the content collection — never hardcoded.
 */
export const heroGradientSchema = z.object({
  headline: z.string().max(80),
  subheadline: z.string().max(200).optional().default(""),
  ctaText: z.string().max(30).optional().default("Get Started"),
  ctaHref: z.string().optional().default("#"),
  badge: z.string().max(30).optional().default(""),
});

export type HeroGradientContent = z.infer<typeof heroGradientSchema>;
