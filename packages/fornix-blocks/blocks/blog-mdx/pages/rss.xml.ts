import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
  const posts = await getCollection("blog");
  
  return rss({
    title: "Blog Feed",
    description: "Our latest blog posts",
    site: context.site ?? "http://localhost:4321",
    items: posts.map((post: any) => ({
      ...post.data,
      link: `/blog/${post.slug}/`,
    })),
  });
};
