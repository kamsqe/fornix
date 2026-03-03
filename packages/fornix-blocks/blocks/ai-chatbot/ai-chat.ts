/**
 * AI Chat — Cloudflare Workers AI integration.
 *
 * Provides a streaming chat completion function backed by Workers AI.
 * Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN env vars.
 */

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface ChatOptions {
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

/**
 * Send a chat completion request to Cloudflare Workers AI.
 * Returns the assistant's response text.
 */
export async function chatCompletion(
  messages: ReadonlyArray<ChatMessage>,
  options: ChatOptions = {},
): Promise<string> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const token = getEnvOrThrow("CLOUDFLARE_AI_TOKEN");
  const model = options.model ?? DEFAULT_MODEL;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.7,
        stream: false,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Workers AI request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { result: { response: string } };
  return data.result.response;
}

/**
 * Stream a chat completion from Cloudflare Workers AI.
 * Yields chunks of text as they arrive.
 */
export async function* chatStream(
  messages: ReadonlyArray<ChatMessage>,
  options: ChatOptions = {},
): AsyncGenerator<string> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const token = getEnvOrThrow("CLOUDFLARE_AI_TOKEN");
  const model = options.model ?? DEFAULT_MODEL;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Workers AI stream failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    yield chunk;
  }
}

function getEnvOrThrow(name: string): string {
  const value = typeof process !== "undefined"
    ? process.env[name]
    : undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
