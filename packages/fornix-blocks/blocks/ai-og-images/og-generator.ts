/**
 * OG Image Generator — Cloudflare Workers AI integration.
 *
 * Generates dynamic Open Graph images using Workers AI text-to-image models.
 * Images are generated on-demand and can be cached at the edge.
 */

export interface OgImageOptions {
  readonly title: string;
  readonly subtitle?: string;
  readonly model?: string;
  readonly width?: number;
  readonly height?: number;
}

const DEFAULT_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/**
 * Generate an OG image using Cloudflare Workers AI.
 * Returns the raw image bytes as a Uint8Array.
 */
export async function generateOgImage(
  options: OgImageOptions,
): Promise<Uint8Array> {
  const accountId = getEnvOrThrow("CLOUDFLARE_ACCOUNT_ID");
  const token = getEnvOrThrow("CLOUDFLARE_AI_TOKEN");
  const model = options.model ?? DEFAULT_MODEL;

  const prompt = buildPrompt(options);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        width: options.width ?? 1200,
        height: options.height ?? 630,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`OG image generation failed: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Build a text-to-image prompt optimized for OG card style.
 */
function buildPrompt(options: OgImageOptions): string {
  const parts = [
    "A clean, professional social media card design",
    `with the title "${options.title}"`,
  ];
  if (options.subtitle) {
    parts.push(`and subtitle "${options.subtitle}"`);
  }
  parts.push(
    "using modern typography, subtle gradients, minimal layout, high contrast text on a dark background",
  );
  return parts.join(" ");
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
