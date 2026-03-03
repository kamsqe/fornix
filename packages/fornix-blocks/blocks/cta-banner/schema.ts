import { z } from "astro:content";

export const ctaBannerSchema = z.object({
  headline: z.string().max(60),
  description: z.string().max(200).optional().default(""),
  ctaText: z.string().max(30).optional().default(""),
  ctaHref: z.string().optional().default("#"),
});

export type CtaBannerContent = z.infer<typeof ctaBannerSchema>;
