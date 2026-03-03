import type { ContentSlot } from "fornix-registry";
import { FIXTURE_MANIFESTS } from "../../cli/fixture-registry.js";
import { ok, err, type Result } from "../../utils/result.js";

// ── Input ───────────────────────────────────────────────────

export interface GetContentSchemaInput {
  readonly collection: string;
}

// ── Output ──────────────────────────────────────────────────

export interface GetContentSchemaOutput {
  readonly collection: string;
  readonly slots: Readonly<Record<string, ContentSlot>>;
}

// ── Implementation ──────────────────────────────────────────

export function getContentSchema(
  input: GetContentSchemaInput,
): Result<GetContentSchemaOutput, Error> {
  const { collection } = input;

  const manifest = FIXTURE_MANIFESTS[collection];
  if (!manifest) {
    return err(
      new Error(`Collection '${collection}' not found in registry.`),
    );
  }

  const contentSlots = manifest.ai?.contentSlots;
  if (!contentSlots || Object.keys(contentSlots).length === 0) {
    return err(
      new Error(
        `Block '${collection}' does not define content slots.`,
      ),
    );
  }

  return ok({
    collection,
    slots: contentSlots,
  });
}
