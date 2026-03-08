import { z } from "astro:content";

const contactItemSchema = z.object({
  icon: z.string(),
  label: z.string(),
  value: z.string(),
  href: z.string().optional().default(""),
});

export const contactSplitSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  description: z.string().max(300).optional().default(""),
  contactItems: z.array(contactItemSchema).min(1).max(6),
  submitText: z.string().optional().default("Send Message"),
});

export type ContactSplitContent = z.infer<typeof contactSplitSchema>;
