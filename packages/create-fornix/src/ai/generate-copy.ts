import type { BlockSource } from "../scaffold/blocks.js";
import { buildSlotSchema } from "../scaffold/slot-schema.js";
import type {
  AIProvider,
  BrandContext,
  CopyRequest,
  CopyResponse,
} from "./provider.js";

export interface GeneratedCopyEntry {
  blockName: string;
  locale: string;
  content: CopyResponse;
  source: "ai" | "default" | "ai-validation-failed";
  /**
   * When `source !== "ai"`, this carries the reason: either the provider's
   * error message (network, rate-limit, model-rejected, etc.) or a
   * one-line summary of the validation failure. Used by the CLI to
   * surface why a block fell back to defaults — silent fallback is the
   * worst possible UX in a paid path.
   */
  error?: string;
}

export interface GenerateCopyOptions {
  provider: AIProvider;
  blocks: ReadonlyArray<BlockSource>;
  brand: BrandContext;
  locales: ReadonlyArray<string>;
  /**
   * Fires once per (block × locale) when that call resolves (success OR
   * fallback). The argument is the GeneratedCopyEntry that was produced.
   * `index` and `total` let callers render a progress meter.
   *
   * Callbacks must not throw — they're called inside a `.then()` chain.
   */
  onTick?: (event: { entry: GeneratedCopyEntry; index: number; total: number }) => void;
  /**
   * Max in-flight provider calls. Default 1 — sequential. Gemini Flash's
   * structured-output mode is dramatically more reliable when calls don't
   * race; bumping to 2-3 cuts latency in half but doubles the fallback
   * rate on heavy-schema blocks. Set higher only on a paid Anthropic tier.
   */
  concurrency?: number;
  /**
   * Retry the provider once when a call fails on the first attempt. Many
   * "could not parse the response" errors from Gemini are transient (the
   * model's structured-output mode is non-deterministic). Default true.
   */
  retryOnce?: boolean;
}

/**
 * Fan out across (block × locale) in parallel, ask the provider for each,
 * validate against a Zod schema derived from the block's `contentSlots`,
 * and fall back to the block's `default-content.json` when:
 *   1. the provider returns an error
 *   2. the response fails schema validation
 *
 * Day-4a never throws — every failure is captured as a `source:"default"`
 * or `"ai-validation-failed"` entry and the caller decides whether to warn.
 */
export async function generateCopyForBlocks(
  options: GenerateCopyOptions,
): Promise<GeneratedCopyEntry[]> {
  const pairs: Array<{ block: BlockSource; locale: string }> = [];
  for (const locale of options.locales) {
    for (const block of options.blocks) {
      pairs.push({ block, locale });
    }
  }
  const total = pairs.length;
  const concurrency = Math.max(1, options.concurrency ?? 1);
  const retryOnce = options.retryOnce ?? true;

  const results: GeneratedCopyEntry[] = new Array(total);
  let nextIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex;
      if (i >= pairs.length) return;
      nextIndex = i + 1;

      const { block, locale } = pairs[i] as { block: BlockSource; locale: string };
      let entry = await generateOne(options.provider, block, locale, options.brand);
      if (retryOnce && entry.source !== "ai") {
        // Transient parse / rate-limit / schema-noise failures often pass
        // on a second attempt with the same prompt — Gemini in particular.
        const retry = await generateOne(options.provider, block, locale, options.brand);
        if (retry.source === "ai") entry = retry;
      }
      results[i] = entry;

      if (options.onTick) {
        completed += 1;
        try {
          options.onTick({ entry, index: completed, total });
        } catch {
          // Tick callbacks must not interrupt generation — swallow.
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

async function generateOne(
  provider: AIProvider,
  block: BlockSource,
  locale: string,
  brand: BrandContext,
): Promise<GeneratedCopyEntry> {
  const slots = block.manifest.ai?.contentSlots;
  const fallback = block.defaultContent ?? {};

  // No slots declared → no AI to generate, keep defaults.
  if (!slots || Object.keys(slots).length === 0) {
    return {
      blockName: block.manifest.name,
      locale,
      content: fallback,
      source: "default",
    };
  }

  const request: CopyRequest = {
    blockName: block.manifest.name,
    blockDescription: block.manifest.description,
    slots,
    brand,
    locale,
  };

  const result = await provider.generateBlockCopy(request);
  if (!result.ok) {
    return {
      blockName: block.manifest.name,
      locale,
      content: fallback,
      source: "default",
      error: result.error.message,
    };
  }

  // Validate against a Zod schema derived from the block's slots.
  const validation = buildSlotSchema(slots).passthrough().safeParse(result.value);
  if (!validation.success) {
    return {
      blockName: block.manifest.name,
      locale,
      content: fallback,
      source: "ai-validation-failed",
      error: validation.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }

  // Merge AI response into defaults so any slot the provider omitted still
  // has a sensible value (the AI is allowed to leave optional fields out).
  return {
    blockName: block.manifest.name,
    locale,
    content: { ...fallback, ...validation.data },
    source: "ai",
  };
}

