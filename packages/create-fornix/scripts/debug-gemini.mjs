/**
 * Debug script — calls Gemini with the hero-text slot schema directly
 * and dumps both the structured-output attempt AND a raw text fallback.
 * Run with: node packages/create-fornix/scripts/debug-gemini.mjs
 * (loads .env from repo root automatically)
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";

// Load .env at repo root manually (we don't depend on dotenv).
const envPath = new URL("../../../.env", import.meta.url);
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match) {
    let value = match[2].trim();
    // Strip matching surrounding quotes (single or double).
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

const apiKey = process.env.GEMINI_API_KEY ?? process.env.gemini_api_key;
if (!apiKey) {
  console.error("no key");
  process.exit(1);
}

const google = createGoogleGenerativeAI({ apiKey });
const MODEL = "gemini-3-flash-preview";

// hero-text schema (same shape as buildSlotSchema produces)
const heroSchema = z.object({
  eyebrow: z.string().max(40).optional().describe("Tiny pre-headline label."),
  headline: z.string().max(90).optional().describe("Primary message — short, specific, claim-driven."),
  subheadline: z.string().max(220).optional().describe("One- or two-line elaboration."),
  primaryCtaText: z.string().max(30).optional().describe("Primary CTA label."),
  primaryCtaHref: z.string().optional().describe("Primary CTA destination."),
  secondaryCtaText: z.string().max(30).optional().describe("Optional secondary CTA."),
  secondaryCtaHref: z.string().optional().describe("Secondary CTA destination."),
});

const prompt = [
  "Brand: Liminal",
  "Description: Independent product designer in Berlin showing 6 case studies",
  "Industry: independent product design",
  "Tone: first-person, direct, slightly literary",
  "Archetype: portfolio",
  "",
  "Section: hero-text",
  "Section purpose: Text-first hero with eyebrow, headline, subhead, CTAs.",
  "",
  "Write copy for each slot. Omit any slot you cannot fill well.",
].join("\n");

const system = [
  "You write marketing copy for website sections.",
  "Voice: clear, specific, brand-aligned. Avoid generic clichés.",
  "Honor every constraint: maxLength is a hard limit, not a target.",
  "Match the requested locale precisely. Write idiomatically — do not translate from English.",
  "Every slot is optional. If you cannot produce strong copy for a slot, omit it.",
  "",
  "This is a personal-portfolio site for an individual designer / engineer / creator. " +
    "Voice: first-person, direct, slightly literary. Show character — what you care about, " +
    "what you don't take. Specific projects beat generic 'I love clean design' framing.",
].join("\n");

console.log("=== Test 1: generateObject WITH system prompt (matches CLI) ===");
try {
  const result = await generateObject({
    model: google(MODEL),
    schema: heroSchema,
    prompt,
    system,
    maxOutputTokens: 2048,
  });
  console.log("OK:", JSON.stringify(result.object, null, 2));
} catch (e) {
  console.log("FAIL:", e.message);
  if (e.text !== undefined) console.log("Raw text from model:", JSON.stringify(e.text).slice(0, 500));
}

console.log("\n=== Test 2: generateText (raw text mode for comparison) ===");
try {
  const result = await generateText({
    model: google(MODEL),
    prompt:
      prompt +
      "\n\nReturn ONLY a valid JSON object (no markdown fences, no commentary).",
    maxOutputTokens: 1024,
  });
  console.log("Raw text:", result.text);
} catch (e) {
  console.log("FAIL:", e.message);
}

console.log("\n=== Test 3: generateObject with structuredOutputs=false ===");
try {
  const result = await generateObject({
    model: google(MODEL),
    schema: heroSchema,
    prompt,
    maxOutputTokens: 1024,
    providerOptions: {
      google: { structuredOutputs: false },
    },
  });
  console.log("OK:", JSON.stringify(result.object, null, 2));
} catch (e) {
  console.log("FAIL:", e.message);
  if (e.text !== undefined) console.log("Raw text from model:", JSON.stringify(e.text));
}
