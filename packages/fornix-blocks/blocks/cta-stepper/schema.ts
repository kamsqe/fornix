import { z } from "astro:content";

const optionSchema = z.object({
  id: z.string(),
  icon: z.string(),
  label: z.string(),
  response: z.string(),
  ctaText: z.string().optional().default("Get Started"),
  ctaHref: z.string().optional().default("#"),
});

export const ctaStepperSchema = z.object({
  headline: z.string().max(80),
  options: z.array(optionSchema).min(2).max(4),
  finalHeadline: z.string().optional().default("You're All Set"),
  finalDescription: z.string().optional().default(""),
  footnote: z.string().optional().default(""),
});

export type CtaStepperContent = z.infer<typeof ctaStepperSchema>;
