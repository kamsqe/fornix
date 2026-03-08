import { z } from "astro:content";

const stepSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
  command: z.string().optional().default(""),
});

export const howItWorksSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  subheadline: z.string().max(200).optional().default(""),
  steps: z.array(stepSchema).min(2).max(5),
});

export type HowItWorksContent = z.infer<typeof howItWorksSchema>;
