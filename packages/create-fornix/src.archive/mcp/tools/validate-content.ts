import { z } from "zod";
import { fetchRegistryIndex } from "../../registry/registry-fetcher.js";
import { ok, err, isOk, type Result } from "../../utils/result.js";

// ── Input ───────────────────────────────────────────────────

export interface ValidateContentInput {
  readonly collection: string;
  readonly data: Record<string, unknown>;
}

// ── Output ──────────────────────────────────────────────────

export interface ValidateContentOutput {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

// ── Implementation ──────────────────────────────────────────

export async function validateContent(
  input: ValidateContentInput,
): Promise<Result<ValidateContentOutput, Error>> {
  const { collection, data } = input;

  const registryResult = await fetchRegistryIndex();
  if (!isOk(registryResult)) {
    return err(new Error(`Failed to fetch block registry: ${registryResult.error.message}`));
  }
  const manifests = registryResult.value.blocks;

  // Find the block manifest
  const manifest = manifests[collection];
  if (!manifest) {
    return err(
      new Error(
        `Collection '${collection}' not found in registry.`,
      ),
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

  // Build a Zod schema from the content slots
  const schemaShape: Record<string, z.ZodTypeAny> = {};
  for (const [slotName, slot] of Object.entries(contentSlots)) {
    schemaShape[slotName] = zodTypeForSlot(slot.type);
  }
  const schema = z.object(schemaShape);

  // Validate
  const parseResult = schema.safeParse(data);
  if (parseResult.success) {
    return ok({ valid: true, errors: [] });
  }

  const errors = parseResult.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );

  return ok({ valid: false, errors });
}

// ── Helpers ─────────────────────────────────────────────────

function zodTypeForSlot(slotType: string): z.ZodTypeAny {
  switch (slotType) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(z.unknown());
    case "object":
      return z.record(z.unknown());
    default:
      return z.unknown();
  }
}
