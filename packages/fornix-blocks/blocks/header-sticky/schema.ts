import { z } from "astro:content";

const navLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const headerStickySchema = z.object({
  brandName: z.string().max(30),
  navLinks: z.array(navLinkSchema).min(2).max(8),
  ctaText: z.string().max(20).optional().default(""),
  ctaHref: z.string().optional().default("#"),
});

export type HeaderStickyContent = z.infer<typeof headerStickySchema>;
