import { z } from "astro:content";

const testimonialSchema = z.object({
  quote: z.string(),
  name: z.string(),
  role: z.string(),
  avatar: z.string().optional().default(""),
});

export const testimonialsWallSchema = z.object({
  headline: z.string().max(60).optional().default(""),
  subheadline: z.string().max(200).optional().default(""),
  testimonials: z.array(testimonialSchema).min(4).max(20),
});

export type TestimonialsWallContent = z.infer<typeof testimonialsWallSchema>;
