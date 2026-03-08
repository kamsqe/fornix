import { z } from "astro:content";

export const heroGlassSchema = z.object({
  badge: z.string().max(40).optional().default(""),
  headline: z.string().max(80),
  subheadline: z.string().max(200).optional().default(""),
  ctaText: z.string().max(30).optional().default("Get Started"),
  ctaHref: z.string().optional().default("#"),
  ctaSecondaryText: z.string().max(30).optional().default(""),
  ctaSecondaryHref: z.string().optional().default("#"),
});

export type HeroGlassContent = z.infer<typeof heroGlassSchema>;
