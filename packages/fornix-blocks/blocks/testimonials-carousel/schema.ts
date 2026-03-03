import { z } from "astro:content";

const testimonialSchema = z.object({
  quote: z.string(),
  name: z.string(),
  role: z.string(),
  avatar: z.string().optional().default(""),
});

export const testimonialsCarouselSchema = z.object({
  headline: z.string().max(60).optional().default(""),
  testimonials: z.array(testimonialSchema).min(3).max(12),
});

export type TestimonialsCarouselContent = z.infer<typeof testimonialsCarouselSchema>;
