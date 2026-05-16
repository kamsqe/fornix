import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const works = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/works" }),
  schema: z.object({
    id: z.string(),                     // "001"
    title: z.string(),
    year: z.number(),
    client: z.string(),
    role: z.string(),
    status: z.enum(["LIVE", "ARCHIVED", "QUIET"]),
    summary: z.string(),
  }),
});

export const collections = { works };
