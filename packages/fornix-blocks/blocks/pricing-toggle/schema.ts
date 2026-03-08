import { z } from "astro:content";

const planSchema = z.object({
  name: z.string(),
  monthlyPrice: z.string(),
  annualPrice: z.string(),
  description: z.string().optional().default(""),
  features: z.array(z.string()),
  ctaText: z.string().optional().default("Get Started"),
  ctaHref: z.string().optional().default("#"),
  highlighted: z.boolean().optional().default(false),
});

export const pricingToggleSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  subheadline: z.string().max(200).optional().default(""),
  monthlyLabel: z.string().optional().default("Monthly"),
  annualLabel: z.string().optional().default("Annual"),
  annualSavings: z.string().optional().default("Save 20%"),
  plans: z.array(planSchema).min(2).max(4),
});

export type PricingToggleContent = z.infer<typeof pricingToggleSchema>;
