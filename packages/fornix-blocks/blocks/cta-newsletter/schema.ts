import { z } from "astro:content";

export const ctaNewsletterSchema = z.object({
  headline: z.string().max(60),
  description: z.string().max(200).optional().default(""),
  placeholder: z.string().max(40).optional().default("Enter your email"),
  buttonText: z.string().max(20).optional().default("Subscribe"),
  privacyText: z.string().max(100).optional().default(""),
});

export type CtaNewsletterContent = z.infer<typeof ctaNewsletterSchema>;
