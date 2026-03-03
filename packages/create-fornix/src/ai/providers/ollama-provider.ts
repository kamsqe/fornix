/**
 * Ollama Provider
 *
 * Uses a local Ollama instance for AI generation.
 * Auto-detects Ollama on localhost:11434.
 * No API key required — fully local and free.
 */

import { IntentSchema, type Intent } from "../rules.js";
import { ok, err, type Result } from "../../utils/result.js";
import type { AIProvider, ProviderError } from "./mock-provider.js";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1";

export function createOllamaProvider(
  opts: { baseUrl?: string; model?: string } = {},
): AIProvider {
  const baseUrl = opts.baseUrl ?? DEFAULT_OLLAMA_URL;
  const model = opts.model ?? DEFAULT_MODEL;

  return {
    name: "ollama",
    async generate(
      prompt: string,
      systemPrompt?: string,
    ): Promise<Result<Intent, ProviderError>> {
      try {
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            format: "json",
            messages: [
              {
                role: "system",
                content:
                  (systemPrompt ?? "You are the Fornix AI assistant.") +
                  "\n\nYou MUST respond with a valid JSON object matching the IntentSchema. Do NOT include any text outside the JSON.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!response.ok) {
          return err({
            kind: "ProviderError",
            message: `Ollama returned status ${response.status}: ${await response.text()}`,
            prompt,
          });
        }

        const data = (await response.json()) as {
          message?: { content?: string };
        };
        const content = data.message?.content;

        if (!content) {
          return err({
            kind: "ProviderError",
            message: "Ollama returned empty response",
            prompt,
          });
        }

        const parsed = JSON.parse(content) as unknown;
        const validated = IntentSchema.parse(parsed);
        return ok(validated);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown Ollama error";
        return err({
          kind: "ProviderError",
          message: `Ollama generation failed: ${message}`,
          prompt,
        });
      }
    },
  };
}

/**
 * Check if Ollama is running locally.
 */
export async function isOllamaRunning(
  baseUrl = DEFAULT_OLLAMA_URL,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const response = await fetch(baseUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
