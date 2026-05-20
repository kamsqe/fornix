import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";

import { ok, err } from "../../utils/result.js";
import { buildSlotSchema } from "../../scaffold/slot-schema.js";
import type {
  AIProvider,
  CopyRequest,
  CopyResponse,
} from "../provider.js";

export interface GoogleProviderOptions {
  apiKey: string;
  /**
   * Gemini model ID. Defaults to `gemini-3-flash-preview` — Pro-level
   * reasoning at Flash-tier latency + cost, which fits Fornix's per-block
   * marketing-copy workload exactly. Override to `gemini-3.1-pro-preview`
   * when you want the smarter model (slower, more expensive).
   */
  model?: string;
  /**
   * Max tokens per block call. Default 2048 is generous for any single
   * section's copy (typical scaffolds use ~300 output tokens/block).
   */
  maxOutputTokens?: number;
}

export const DEFAULT_GOOGLE_MODEL = "gemini-3-flash-preview";
// 4096 is the empirically-best cap for Gemini 3 Flash on Fornix's block
// schemas. Going higher (8192+) paradoxically makes Gemini more likely to
// truncate mid-response on heavy-array blocks (features/testimonials/faq),
// possibly because the model's thinking-budget allocator over-allocates
// when the cap is large. With thinkingLevel="minimal" + 4096 we land
// 5+/8 typical without needing the smarter Pro model.
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

/**
 * Real provider — uses Google's Gemini via the Vercel AI SDK's
 * `generateObject`, which guarantees the response parses against the
 * supplied Zod schema or throws (caught and surfaced as a `ProviderError`).
 *
 * Mirrors `providers/anthropic.ts`. The two implementations are kept
 * parallel rather than merged so each provider's prompt-tuning + retry
 * behaviour can diverge if the model families need it.
 */
export function createGoogleProvider(
  options: GoogleProviderOptions,
): AIProvider {
  const google = createGoogleGenerativeAI({ apiKey: options.apiKey });
  const modelId = options.model ?? DEFAULT_GOOGLE_MODEL;
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;

  return {
    name: "google",
    async generateBlockCopy(request: CopyRequest) {
      const schema = buildSlotSchema(request.slots);

      try {
        const result = await generateObject({
          model: google(modelId),
          schema,
          maxOutputTokens,
          system: buildSystemPrompt(request.brand.archetype),
          prompt: buildBlockPrompt(request),
          providerOptions: {
            google: {
              // Marketing-copy generation is a single-pass instruction task,
              // not a reasoning task — keep the thinking budget out of the
              // way so the full token budget reaches the visible JSON.
              thinkingConfig: { thinkingLevel: "minimal" },
              // Gemini 3 Flash's strict structured-output mode misbehaves
              // on optional-field-heavy schemas with nested arrays of
              // objects — measured 2-6/8 success in live runs. Disabling
              // it makes the AI SDK send the schema as a JSON-mode hint
              // and parse the model's output, which is much more reliable
              // because Gemini 3 is a strong JSON-emitter on its own.
              structuredOutputs: false,
            },
          },
        });
        return ok(result.object as CopyResponse);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return err({
          kind: "ProviderError",
          provider: "google",
          message,
        });
      }
    },
  };
}

// ── Prompts ──────────────────────────────────────────────
// Identical guidance to the Anthropic provider — same archetype voice
// for the user regardless of which model fills the slots.

const ARCHETYPE_GUIDANCE: Record<NonNullable<CopyRequest["brand"]["archetype"]>, string> = {
  saas:
    "This is a SaaS product site. Voice: confident, specific, slightly opinionated. " +
    "Lead with what the product does, not adjectives. Concrete benefits over abstract value props. " +
    "Avoid the SaaS-cliché stack: streamline, empower, unlock, revolutionize, supercharge, robust.",
  agency:
    "This is an agency / studio site. Voice: editorial, restrained, confident. " +
    "Show range without bragging. Lean on specifics (client names, project shapes, materials). " +
    "Avoid 'award-winning', 'passionate', 'creative team' — let the work make those claims.",
  portfolio:
    "This is a personal-portfolio site for an individual designer / engineer / creator. " +
    "Voice: first-person, direct, slightly literary. Show character — what you care about, " +
    "what you don't take. Specific projects beat generic 'I love clean design' framing.",
  gym:
    "This is a fitness / strength-training site. Voice: direct, physical, no-nonsense. " +
    "Reference real lifts, real schedules, real coaches. Avoid wellness-industry vagueness " +
    "('your journey', 'community', 'transformation' as nouns) unless backed by specifics.",
  restaurant:
    "This is a restaurant / café / food site. Voice: sensory, place-rooted, generous. " +
    "Reference ingredients, sourcing, room scale, hours, what changes weekly. " +
    "Avoid 'unique culinary experience' and 'curated' — name dishes, name suppliers, name the room.",
};

function buildSystemPrompt(archetype?: CopyRequest["brand"]["archetype"]): string {
  const base = [
    "You write marketing copy for website sections.",
    "Voice: clear, specific, brand-aligned. Avoid generic clichés.",
    "Honor every constraint: maxLength is a hard limit, not a target.",
    "Match the requested locale precisely. Write idiomatically — do not translate from English.",
    "Every slot is optional. If you cannot produce strong copy for a slot, omit it.",
  ];
  if (archetype && ARCHETYPE_GUIDANCE[archetype]) {
    base.push("", ARCHETYPE_GUIDANCE[archetype]);
  }
  return base.join("\n");
}

function buildBlockPrompt(request: CopyRequest): string {
  const { brand, locale, blockName, blockDescription, slots } = request;

  const slotLines = Object.entries(slots).map(([key, slot]) => {
    const parts: string[] = [`- ${key} (${slot.type})`];
    if (slot.description) parts.push(`  description: ${slot.description}`);
    if (slot.maxLength !== undefined) parts.push(`  maxLength: ${slot.maxLength}`);
    if (slot.minItems !== undefined) parts.push(`  minItems: ${slot.minItems}`);
    if (slot.maxItems !== undefined) parts.push(`  maxItems: ${slot.maxItems}`);
    if (slot.example !== undefined) {
      parts.push(`  example: ${JSON.stringify(slot.example)}`);
    }
    return parts.join("\n");
  });

  return [
    `Brand: ${brand.name}`,
    `Description: ${brand.description}`,
    `Industry: ${brand.industry}`,
    `Tone: ${brand.tone}`,
    brand.audience ? `Audience: ${brand.audience}` : "",
    brand.archetype ? `Archetype: ${brand.archetype}` : "",
    "",
    `Locale: ${locale}`,
    "",
    `Section: ${blockName}`,
    `Section purpose: ${blockDescription}`,
    "",
    "Slots:",
    ...slotLines,
    "",
    "Write copy for each slot. Omit any slot you cannot fill well.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export const __internals = { buildSystemPrompt, buildBlockPrompt };
