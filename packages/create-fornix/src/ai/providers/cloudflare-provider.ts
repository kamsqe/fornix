/**
 * Cloudflare Workers AI Provider
 *
 * Uses the Cloudflare Workers AI REST API for generation.
 * Free tier available for Cloudflare deployments.
 * Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.
 */

import { IntentSchema, type Intent } from "../schemas.js";
import { ok, err, type Result } from "../../utils/result.js";
import type { AIProvider, ProviderError } from "./mock-provider.js";

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export function createCloudflareProvider(
  opts: { accountId?: string; apiToken?: string; model?: string } = {},
): AIProvider {
  const accountId =
    opts.accountId ?? process.env["CLOUDFLARE_ACCOUNT_ID"];
  const apiToken =
    opts.apiToken ?? process.env["CLOUDFLARE_API_TOKEN"];
  const model = opts.model ?? DEFAULT_MODEL;

  return {
    name: "cloudflare",
    async generate(
      prompt: string,
      systemPrompt?: string,
    ): Promise<Result<Intent, ProviderError>> {
      if (!accountId || !apiToken) {
        return err({
          kind: "ProviderError",
          message:
            "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set.",
          prompt,
        });
      }

      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  (systemPrompt ?? "You are the Fornix AI assistant.") +
                  "\n\nRespond with a valid JSON object matching the IntentSchema. No text outside JSON.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!response.ok) {
          return err({
            kind: "ProviderError",
            message: `Cloudflare AI returned status ${response.status}: ${await response.text()}`,
            prompt,
          });
        }

        const data = (await response.json()) as {
          result?: { response?: string };
        };
        const content = data.result?.response;

        if (!content) {
          return err({
            kind: "ProviderError",
            message: "Cloudflare AI returned empty response",
            prompt,
          });
        }

        const parsed = JSON.parse(content) as unknown;
        const validated = IntentSchema.parse(parsed);
        return ok(validated);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown Cloudflare AI error";
        return err({
          kind: "ProviderError",
          message: `Cloudflare AI generation failed: ${message}`,
          prompt,
        });
      }
    },
  };
}
