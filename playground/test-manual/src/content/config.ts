import { defineCollection, z } from "astro:content";

export const collections = {
  "sections": defineCollection({
    type: "data",
    schema: z.record(z.unknown()),
  })
};
