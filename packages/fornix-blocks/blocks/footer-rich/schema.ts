import { z } from "astro:content";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const columnSchema = z.object({
  title: z.string(),
  links: z.array(linkSchema),
});

export const footerRichSchema = z.object({
  brandName: z.string().max(40),
  brandDescription: z.string().max(200).optional().default(""),
  columns: z.array(columnSchema).min(2).max(4),
  copyright: z.string().max(100).optional().default(""),
});

export type FooterRichContent = z.infer<typeof footerRichSchema>;
