/**
 * OpenAI Provider
 *
 * Uses the Vercel AI SDK with OpenAI's API for structured output generation.
 * Requires OPENAI_API_KEY environment variable.
 *
 * Dependencies (ai, @ai-sdk/openai) are lazily imported to avoid
 * breaking tests/builds when they aren't installed.
 */

import { IntentSchema, type Intent } from "../rules.js";
import { ok, err, type Result } from "../../utils/result.js";
import type { AIProvider, ProviderError } from "./mock-provider.js";

export function createOpenAIProvider(apiKey?: string): AIProvider {
  const key = apiKey ?? process.env["OPENAI_API_KEY"];

  return {
    name: "openai",
    async generate(
      prompt: string,
      systemPrompt?: string,
    ): Promise<Result<Intent, ProviderError>> {
      if (!key) {
        return err({
          kind: "ProviderError",
          message: "OPENAI_API_KEY not set. Set it in your environment or pass it explicitly.",
          prompt,
        });
      }

      try {
        // Lazy import to avoid breaking when ai SDK is not installed
        const { generateObject } = await import("ai");
        const { openai } = await import("@ai-sdk/openai");

        const result = await generateObject({
          model: openai("gpt-4o-mini", { structuredOutputs: true }),
          schema: IntentSchema,
          system: systemPrompt ?? "You are the Fornix AI assistant. Analyze the user's website description and produce a structured Intent object.",
          prompt,
          maxTokens: 2000,
        });

        return ok(result.object);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown OpenAI error";
        return err({
          kind: "ProviderError",
          message: `OpenAI generation failed: ${message}`,
          prompt,
        });
      }
    },
  };
}
