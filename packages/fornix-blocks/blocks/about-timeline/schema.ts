import { z } from "astro:content";

const milestoneSchema = z.object({
  year: z.string(),
  icon: z.string(),
  title: z.string(),
  description: z.string(),
  isCta: z.boolean().optional().default(false),
});

export const aboutTimelineSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  subheadline: z.string().max(200).optional().default(""),
  milestones: z.array(milestoneSchema).min(3).max(8),
  ctaText: z.string().optional().default(""),
  ctaHref: z.string().optional().default("#"),
});

export type AboutTimelineContent = z.infer<typeof aboutTimelineSchema>;
