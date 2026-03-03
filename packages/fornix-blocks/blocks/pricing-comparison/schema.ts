import { z } from "astro:content";

const planHeaderSchema = z.object({
  name: z.string(),
  price: z.string(),
  ctaText: z.string(),
  ctaHref: z.string(),
  highlighted: z.boolean().optional().default(false),
});

const featureRowSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export const pricingComparisonSchema = z.object({
  headline: z.string().max(60),
  subheadline: z.string().max(200).optional().default(""),
  plans: z.array(planHeaderSchema).min(2).max(4),
  features: z.array(featureRowSchema),
});

export type PricingComparisonContent = z.infer<typeof pricingComparisonSchema>;
