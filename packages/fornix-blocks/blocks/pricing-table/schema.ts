import { z } from "astro:content";

const planSchema = z.object({
  name: z.string(),
  price: z.string(),
  period: z.string().optional().default(""),
  description: z.string(),
  features: z.array(z.string()),
  ctaText: z.string(),
  ctaHref: z.string(),
  highlighted: z.boolean().optional().default(false),
});

export const pricingTableSchema = z.object({
  headline: z.string().max(60),
  subheadline: z.string().max(200).optional().default(""),
  plans: z.array(planSchema).min(2).max(4),
});

export type PricingTableContent = z.infer<typeof pricingTableSchema>;
