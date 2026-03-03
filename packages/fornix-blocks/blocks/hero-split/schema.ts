import { z } from "astro:content";

export const heroSplitSchema = z.object({
  headline: z.string().max(80),
  subheadline: z.string().max(250).optional().default(""),
  ctaText: z.string().max(30).optional().default(""),
  ctaHref: z.string().optional().default("#"),
  secondaryCtaText: z.string().max(30).optional().default(""),
  secondaryCtaHref: z.string().optional().default("#"),
  imageAlt: z.string().max(120).optional().default(""),
});

export type HeroSplitContent = z.infer<typeof heroSplitSchema>;
