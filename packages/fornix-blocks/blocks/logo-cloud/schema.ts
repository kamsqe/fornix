import { z } from "astro:content";

const logoItemSchema = z.object({
  name: z.string(),
  src: z.string().optional().default(""),
  href: z.string().optional().default(""),
});

export const logoCloudSchema = z.object({
  headline: z.string().max(60).optional().default(""),
  logos: z.array(logoItemSchema).min(4).max(12),
});

export type LogoCloudContent = z.infer<typeof logoCloudSchema>;
