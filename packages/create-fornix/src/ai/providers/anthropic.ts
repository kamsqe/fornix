import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";

import { ok, err } from "../../utils/result.js";
import { buildSlotSchema } from "../../scaffold/slot-schema.js";
import type {
  AIProvider,
  CopyRequest,
  CopyResponse,
} from "../provider.js";

export interface AnthropicProviderOptions {
  apiKey: string;
  /**
   * Anthropic model ID. Defaults to Sonnet 4.6 — the right balance of
   * generation quality and cost for marketing copy.
   * Override to `claude-haiku-4-5` for cheaper/faster scaffolds.
   */
  model?: string;
  /**
   * Optional max tokens per block call. Default 2048 is generous for any
   * single section's copy (typical scaffolds use ~300 output tokens/block).
   */
  maxOutputTokens?: number;
}

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_OUTPUT_TOKENS = 2048;

/**
 * Real provider — uses Anthropic via the Vercel AI SDK's `generateObject`,
 * which guarantees the response parses against the supplied Zod schema or
 * throws (caught and surfaced as a `ProviderError`).
 *
 * Day-4a's mock provider stays the integration test; this implementation
 * is what gets exercised when the user runs the CLI with a real API key.
 */
export function createAnthropicProvider(
  options: AnthropicProviderOptions,
): AIProvider {
  const anthropic = createAnthropic({ apiKey: options.apiKey });
  const modelId = options.model ?? DEFAULT_MODEL;
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;

  return {
    name: "anthropic",
    async generateBlockCopy(request: CopyRequest) {
      const schema = buildSlotSchema(request.slots);

      try {
        const result = await generateObject({
          model: anthropic(modelId),
          schema,
          maxOutputTokens,
          system: buildSystemPrompt(request.brand.archetype),
          prompt: buildBlockPrompt(request),
        });
        return ok(result.object as CopyResponse);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return err({
          kind: "ProviderError",
          provider: "anthropic",
          message,
        });
      }
    },
  };
}

// ── Prompts ──────────────────────────────────────────────

/**
 * Per-archetype voice guidance. Concrete enough to shape the AI's choices,
 * short enough to not crowd out the slot schema. Tuned by inspecting the
 * default-content of each archetype and asking "what makes this one's copy
 * feel right vs wrong?"
 */
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

// Exported for unit tests — covers the archetype-guidance branching without
// hitting the live API.
export const __internals = { buildSystemPrompt, buildBlockPrompt };
