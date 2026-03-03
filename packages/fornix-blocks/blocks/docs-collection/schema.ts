import { z } from "astro:content";

export const schema = z.object({
  title: z.string().max(80),
  description: z.string().max(200),
  order: z.number().int().optional(),
});
