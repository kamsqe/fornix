import { z } from "astro:content";

export const heroVideoSchema = z.object({
  headline: z.string().max(60),
  subheadline: z.string().max(200).optional().default(""),
  ctaText: z.string().max(30).optional().default(""),
  ctaHref: z.string().optional().default("#"),
  videoUrl: z.string().optional().default(""),
  posterUrl: z.string().optional().default(""),
});

export type HeroVideoContent = z.infer<typeof heroVideoSchema>;
