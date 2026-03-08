import { z } from "astro:content";

const reactionSchema = z.object({
  emoji: z.string(),
  count: z.number(),
});

const messageSchema = z.object({
  quote: z.string(),
  author: z.string(),
  role: z.string().optional().default(""),
  company: z.string().optional().default(""),
  avatar: z.string().optional().default(""),
  time: z.string().optional().default(""),
  reactions: z.array(reactionSchema).optional().default([]),
  verified: z.boolean().optional().default(false),
});

export const testimonialsChatSchema = z.object({
  badge: z.string().max(30).optional().default(""),
  headline: z.string().max(80),
  messages: z.array(messageSchema).min(3).max(8),
});

export type TestimonialsChatContent = z.infer<typeof testimonialsChatSchema>;
