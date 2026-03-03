import { z } from "astro:content";

const bentoItemSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
  size: z.enum(["small", "medium", "large"]).optional().default("small"),
});

export const featuresBentoSchema = z.object({
  headline: z.string().max(60),
  subheadline: z.string().max(200).optional().default(""),
  items: z.array(bentoItemSchema).min(4).max(8),
});

export type FeaturesBentoContent = z.infer<typeof featuresBentoSchema>;
