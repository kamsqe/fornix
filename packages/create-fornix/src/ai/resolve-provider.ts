/**
 * Provider Resolution
 *
 * Resolves which AI provider to use based on:
 * 1. Explicit --provider flag
 * 2. Auto-detect local Ollama
 * 3. Check env vars: ANTHROPIC → OPENAI → CLOUDFLARE → OPENROUTER
 * 4. No provider found → return null
 */

import type { AIProvider } from "./providers/mock-provider.js";
import { createOpenAIProvider } from "./providers/openai-provider.js";
import { createOllamaProvider, isOllamaRunning } from "./providers/ollama-provider.js";
import { createCloudflareProvider } from "./providers/cloudflare-provider.js";
import { createMockProvider } from "./providers/mock-provider.js";

// ── Types ────────────────────────────────────────────────

export type ProviderName =
  | "openai"
  | "ollama"
  | "cloudflare"
  | "mock";

export interface ResolveOptions {
  /** Explicit provider name (from --provider flag) */
  readonly provider?: ProviderName;
  /** Skip Ollama detection (for testing) */
  readonly skipOllamaDetect?: boolean;
  /** Custom environment variables (for testing) */
  readonly env?: Readonly<Record<string, string | undefined>>;
}

// ── Public API ───────────────────────────────────────────

/**
 * Resolve which AI provider to use.
 *
 * Resolution order:
 * 1. Explicit --provider flag
 * 2. Auto-detect local Ollama (if running)
 * 3. Check env vars: OPENAI_API_KEY → CLOUDFLARE_ACCOUNT_ID+TOKEN
 * 4. No provider found → null
 */
export async function resolveProvider(
  opts: ResolveOptions = {},
): Promise<AIProvider | null> {
  const env = opts.env ?? process.env;

  // 1. Explicit provider
  if (opts.provider) {
    return createProviderByName(opts.provider, env);
  }

  // 2. Auto-detect Ollama
  if (!opts.skipOllamaDetect) {
    const ollamaRunning = await isOllamaRunning();
    if (ollamaRunning) {
      return createOllamaProvider();
    }
  }

  // 3. Check env vars
  if (env["OPENAI_API_KEY"]) {
    return createOpenAIProvider(env["OPENAI_API_KEY"]);
  }

  if (env["CLOUDFLARE_ACCOUNT_ID"] && env["CLOUDFLARE_API_TOKEN"]) {
    return createCloudflareProvider({
      accountId: env["CLOUDFLARE_ACCOUNT_ID"],
      apiToken: env["CLOUDFLARE_API_TOKEN"],
    });
  }

  // 4. No provider found
  return null;
}

// ── Helpers ──────────────────────────────────────────────

function createProviderByName(
  name: ProviderName,
  env: Readonly<Record<string, string | undefined>>,
): AIProvider {
  switch (name) {
    case "openai":
      return createOpenAIProvider(env["OPENAI_API_KEY"]);
    case "ollama":
      return createOllamaProvider();
    case "cloudflare":
      return createCloudflareProvider({
        accountId: env["CLOUDFLARE_ACCOUNT_ID"],
        apiToken: env["CLOUDFLARE_API_TOKEN"],
      });
    case "mock":
      return createMockProvider();
  }
}
