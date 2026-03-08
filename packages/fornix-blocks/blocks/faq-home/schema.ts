import { z } from "astro:content";

const faqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const faqHomeSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  items: z.array(faqItemSchema).min(3).max(8),
});

export type FaqHomeContent = z.infer<typeof faqHomeSchema>;
