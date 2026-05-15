import type { ContentSlot } from "fornix-registry";

import type { Result } from "../utils/result.js";
import type { ProviderError } from "../errors.js";

/**
 * Brand context handed to the AI when generating copy.
 * One brand per scaffold — applied to every block, every locale.
 */
export interface BrandContext {
  name: string;
  description: string;
  tone: string;
  industry: string;
  audience?: string;
}

/**
 * Request handed to a provider for one block × one locale.
 *
 * The block-author's `contentSlots` are the schema-as-prompt — descriptions,
 * `maxLength`, `example` and `type` are all forwarded verbatim, so adding a
 * new block requires no provider changes.
 */
export interface CopyRequest {
  blockName: string;
  blockDescription: string;
  slots: Record<string, ContentSlot>;
  brand: BrandContext;
  locale: string;
}

/**
 * One block's worth of AI-generated content.
 * Validated against a Zod schema derived from `slots` before reaching
 * the scaffold pipeline.
 */
export type CopyResponse = Record<string, unknown>;

export interface AIProvider {
  /** Human-readable name of the provider (for logs + errors). */
  readonly name: string;

  /**
   * Generate copy for one block. Implementations should be safe to call in
   * parallel — `generate-copy.ts` fans out across blocks via `Promise.all`.
   */
  generateBlockCopy(
    request: CopyRequest,
  ): Promise<Result<CopyResponse, ProviderError>>;
}
