import { z, defineCollection } from "astro:content";
export const docs = defineCollection({ schema: z.any() });
