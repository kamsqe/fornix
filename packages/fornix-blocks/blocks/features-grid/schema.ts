import { z } from "astro:content";

/**
 * Content collection schema for the features-grid section block.
 * All visible text is sourced from the content collection — never hardcoded.
 */
export const featuresGridSchema = z.object({
  headline: z.string().max(80),
  subheadline: z.string().max(200).optional().default(""),
  features: z.array(
    z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string(),
    })
  ).min(2).max(12),
});

export type FeaturesGridContent = z.infer<typeof featuresGridSchema>;
