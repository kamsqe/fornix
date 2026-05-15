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
          system: buildSystemPrompt(),
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

function buildSystemPrompt(): string {
  return [
    "You write marketing copy for website sections.",
    "Voice: clear, specific, brand-aligned. Avoid generic SaaS clichés ('streamline', 'empower', 'unlock', 'revolutionize').",
    "Honor every constraint: maxLength is a hard limit, not a target.",
    "Match the requested locale precisely. Write idiomatically — do not translate from English.",
    "Every slot is optional. If you cannot produce strong copy for a slot, omit it.",
  ].join("\n");
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
    .filter((line) => line !== "" || true) // keep blank lines
    .join("\n");
}
