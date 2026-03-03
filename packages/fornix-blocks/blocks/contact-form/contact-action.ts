/**
 * Contact Form Action — Astro Action for processing contact form submissions.
 *
 * This is a server-side action that validates and processes form data.
 * Replace the handler logic with your preferred email service or CRM integration.
 */

import { defineAction, z } from "astro:actions";

export const contactSubmit = defineAction({
  accept: "form",
  input: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    subject: z.string().max(200).optional().default(""),
    message: z.string().min(1).max(5000),
  }),
  handler: async (input) => {
    // In production, integrate with your email service here.
    // Examples: Resend, SendGrid, Postmark, or Cloudflare Email Workers.
    console.log("Contact form submission:", input);

    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  },
});
