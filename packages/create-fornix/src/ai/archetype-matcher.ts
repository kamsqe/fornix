/**
 * Prompt → archetype matcher.
 *
 * When the user runs `create-fornix my-site --prompt "..."` WITHOUT an
 * explicit `--archetype`, we ask the AI to pick the right archetype
 * from the 5 we ship (saas, agency, portfolio, gym, restaurant) and
 * synthesize a BrandContext from the prompt.
 *
 * Two-call strategy:
 *   1. matchArchetype(prompt, provider) → { archetype, brand, confidence }
 *   2. CLI loads the matched archetype, then runs the normal AI copy
 *      generation on top of it.
 *
 * Falls back to "saas" with a generic brand when:
 *   - the provider errors
 *   - the response fails schema validation
 *   - confidence < 0.4 (matcher isn't sure → safer default than wrong pick)
 *
 * Cost: one Sonnet call per scaffold (~200 input tokens, ~300 output) —
 * roughly $0.003. Cheap enough to be unconditional when --prompt is set.
 */

import { z } from "zod";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";

import { ok, err, type Result } from "../utils/result.js";
import type { ProviderError } from "../errors.js";
import type { BrandContext } from "./provider.js";

// ── Schema ────────────────────────────────────────────────

export const ARCHETYPE_NAMES = [
  "saas",
  "agency",
  "portfolio",
  "gym",
  "restaurant",
] as const;
export type ArchetypeName = (typeof ARCHETYPE_NAMES)[number];

export const ArchetypeMatchSchema = z.object({
  archetype: z.enum(ARCHETYPE_NAMES),
  reasoning: z
    .string()
    .min(1)
    .describe(
      "One sentence explaining why this archetype fits — shown to the user before scaffolding.",
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0.0 = guess, 1.0 = obvious match. Below 0.4 we fall back to the safe default.",
    ),
  brand: z.object({
    name: z
      .string()
      .min(1)
      .describe("Short brand name (1-3 words). Inferred from the prompt or invented."),
    description: z
      .string()
      .min(1)
      .describe("One-line description of what the site is for."),
    tone: z
      .string()
      .min(1)
      .describe(
        "Brand voice — e.g. 'editorial, confident' or 'warm, conversational, technical'.",
      ),
    industry: z
      .string()
      .min(1)
      .describe("Industry / category — e.g. 'developer tools', 'fine dining'."),
    audience: z
      .string()
      .optional()
      .describe(
        "Who the site speaks to — e.g. 'senior backend engineers', 'returning customers in their 30s'.",
      ),
  }),
});

export type ArchetypeMatch = z.infer<typeof ArchetypeMatchSchema>;

// ── Public API ────────────────────────────────────────────

export interface MatchArchetypeOptions {
  prompt: string;
  apiKey: string;
  model?: string;
  /**
   * Project name (CLI positional). Used as the fallback brand name when the
   * matcher can't infer one and as a hint to the AI about the slug the user
   * already typed.
   */
  projectName: string;
}

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_OUTPUT_TOKENS = 800;
const MIN_CONFIDENCE = 0.4;

export async function matchArchetype(
  options: MatchArchetypeOptions,
): Promise<Result<ArchetypeMatch, ProviderError>> {
  const anthropic = createAnthropic({ apiKey: options.apiKey });
  const modelId = options.model ?? DEFAULT_MODEL;

  try {
    const result = await generateObject({
      model: anthropic(modelId),
      schema: ArchetypeMatchSchema,
      maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(options.prompt, options.projectName),
    });
    return ok(result.object);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({
      kind: "ProviderError",
      provider: "anthropic",
      message,
    });
  }
}

/**
 * Apply confidence threshold. Below the floor, fall back to a safe default
 * rather than scaffold a wrong-shaped site that the user would have to
 * redo. The CLI prints the fallback decision so it isn't silent.
 */
export function resolveMatch(
  match: ArchetypeMatch,
): { archetype: ArchetypeName; fellBack: boolean } {
  if (match.confidence < MIN_CONFIDENCE) {
    return { archetype: "saas", fellBack: true };
  }
  return { archetype: match.archetype, fellBack: false };
}

/**
 * Project the matcher's brand block onto the `BrandContext` shape that
 * the copy-generation provider expects.
 */
export function brandFromMatch(match: ArchetypeMatch): BrandContext {
  return {
    name: match.brand.name,
    description: match.brand.description,
    tone: match.brand.tone,
    industry: match.brand.industry,
    audience: match.brand.audience,
    archetype: match.archetype,
  };
}

// ── Prompts ───────────────────────────────────────────────

function buildSystemPrompt(): string {
  return [
    "You are an archetype matcher for Fornix, a CLI that scaffolds Astro websites.",
    "Given a one-line project description, pick the best archetype from this list:",
    "",
    "  saas       — software products, dev tools, productivity apps, B2B SaaS",
    "  agency     — design studios, branding agencies, consultancies, service businesses",
    "  portfolio  — independent designers / engineers / writers / photographers showing personal work",
    "  gym        — fitness studios, gyms, martial arts schools, anything with physical training",
    "  restaurant — restaurants, cafés, bakeries, food trucks, anywhere people eat",
    "",
    "Also extract the brand: name, description, voice/tone, industry, audience.",
    "Be honest about confidence — 0.95 for an obvious match, 0.50 for a stretch, 0.20 for a wild guess.",
    "If the description is unrelated to all five archetypes, pick the closest and lower confidence.",
    "Never invent capabilities (auth, payments, dashboards) that aren't asked for — pick by shape, not feature.",
  ].join("\n");
}

function buildUserPrompt(prompt: string, projectName: string): string {
  return [
    `Project slug the user typed: ${projectName}`,
    `Description: ${prompt}`,
    "",
    "Pick the best archetype and fill the brand fields. Reply as the structured object.",
  ].join("\n");
}
