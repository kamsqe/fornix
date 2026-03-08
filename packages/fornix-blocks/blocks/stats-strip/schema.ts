import { z } from "astro:content";

const statItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  accent: z.boolean().optional().default(false),
});

export const statsStripSchema = z.object({
  items: z.array(statItemSchema).min(3).max(8),
});

export type StatsStripContent = z.infer<typeof statsStripSchema>;
