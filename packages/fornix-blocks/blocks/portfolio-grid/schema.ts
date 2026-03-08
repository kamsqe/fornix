import { z } from "astro:content";

const projectSchema = z.object({
  title: z.string(),
  category: z.string(),
  description: z.string().optional().default(""),
  image: z.string().optional().default(""),
  href: z.string().optional().default("#"),
});

export const portfolioGridSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  subheadline: z.string().max(200).optional().default(""),
  categories: z.array(z.string()).min(2),
  projects: z.array(projectSchema).min(3).max(12),
});

export type PortfolioGridContent = z.infer<typeof portfolioGridSchema>;
