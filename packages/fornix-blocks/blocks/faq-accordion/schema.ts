import { z } from "astro:content";

const faqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const faqAccordionSchema = z.object({
  headline: z.string().max(60).optional().default(""),
  subheadline: z.string().max(200).optional().default(""),
  items: z.array(faqItemSchema).min(3).max(12),
});

export type FaqAccordionContent = z.infer<typeof faqAccordionSchema>;
