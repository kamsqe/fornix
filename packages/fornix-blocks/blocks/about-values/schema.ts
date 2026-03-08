import { z } from "astro:content";

const valueSchema = z.object({
  icon: z.string(),
  name: z.string(),
  statement: z.string(),
  proof: z.string().optional().default(""),
  featured: z.boolean().optional().default(false),
  quote: z.string().optional().default(""),
  quoteAuthor: z.string().optional().default(""),
  quoteRole: z.string().optional().default(""),
});

export const aboutValuesSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(100),
  subheadline: z.string().max(200).optional().default(""),
  values: z.array(valueSchema).min(2).max(6),
  ctaText: z.string().optional().default(""),
  ctaHref: z.string().optional().default("#"),
});

export type AboutValuesContent = z.infer<typeof aboutValuesSchema>;
