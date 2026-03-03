import { z } from "astro:content";

export const contactFormSchema = z.object({
  headline: z.string().max(60),
  description: z.string().max(200).optional().default(""),
  namePlaceholder: z.string().max(30).optional().default("Your name"),
  emailPlaceholder: z.string().max(30).optional().default("Your email"),
  subjectPlaceholder: z.string().max(40).optional().default("Subject"),
  messagePlaceholder: z.string().max(40).optional().default("Your message"),
  buttonText: z.string().max(20).optional().default("Send Message"),
  successMessage: z.string().max(100).optional().default(""),
});

export type ContactFormContent = z.infer<typeof contactFormSchema>;
