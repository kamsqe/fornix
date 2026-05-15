import { z } from "zod";
import type { ContentSlot } from "fornix-registry";

import type { BlockSource } from "../scaffold/blocks.js";
import { zodObjectForSlots } from "../scaffold/zod-from-slots.js";
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
}

export interface GenerateCopyOptions {
  provider: AIProvider;
  blocks: ReadonlyArray<BlockSource>;
  brand: BrandContext;
  locales: ReadonlyArray<string>;
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
  const tasks: Promise<GeneratedCopyEntry>[] = [];

  for (const locale of options.locales) {
    for (const block of options.blocks) {
      tasks.push(generateOne(options.provider, block, locale, options.brand));
    }
  }

  return Promise.all(tasks);
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
    };
  }

  // Validate against a Zod schema derived from the block's slots.
  const validation = buildRuntimeSchema(slots).safeParse(result.value);
  if (!validation.success) {
    return {
      blockName: block.manifest.name,
      locale,
      content: fallback,
      source: "ai-validation-failed",
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

/**
 * Runtime Zod schema derived from a block's slot map.
 *
 * Mirrors `zodObjectForSlots` (which emits the same shape as TEXT into the
 * generated `content.config.ts`), but lives in-process so we can validate
 * provider output without invoking `eval`.
 */
function buildRuntimeSchema(
  slots: Record<string, ContentSlot>,
): z.ZodTypeAny {
  // Keep the textual generator as the source of truth for the *shape*, but
  // implement a parallel runtime instance here. If a slot type is added to
  // `ContentSlot`, both will need updating — a small price for not exec'ing
  // generated code.
  void zodObjectForSlots; // intentional reference to flag the coupling

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, slot] of Object.entries(slots)) {
    let base: z.ZodTypeAny;
    switch (slot.type) {
      case "string":
        base = slot.maxLength !== undefined
          ? z.string().max(slot.maxLength)
          : z.string();
        break;
      case "number":
        base = z.number();
        break;
      case "boolean":
        base = z.boolean();
        break;
      case "array":
        base = z.array(z.record(z.unknown()));
        break;
      case "object":
        base = z.record(z.unknown());
        break;
    }
    shape[key] = base.optional();
  }
  return z.object(shape).passthrough();
}
