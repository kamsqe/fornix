import { z } from "astro:content";

const statCardSchema = z.object({
  icon: z.string(),
  value: z.string(),
  subtitle: z.string(),
  description: z.string().optional().default(""),
});

export const aboutStatsSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  description: z.string().max(300).optional().default(""),
  stats: z.array(statCardSchema).min(2).max(4),
  trustHeadline: z.string().optional().default(""),
  trustLabels: z.array(z.string()).optional().default([]),
});

export type AboutStatsContent = z.infer<typeof aboutStatsSchema>;
