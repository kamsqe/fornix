import { z } from "zod";
import type { ContentSlot } from "fornix-registry";

/**
 * Runtime Zod schema derived from a block's slot map.
 *
 * Mirrors `zodObjectForSlots` (which emits the same shape as TEXT into the
 * generated `content.config.ts`), but produces a real `z.ZodTypeAny` instance
 * so we can both validate provider output and constrain `generateObject`
 * structured-output calls without `eval`'ing generated code.
 *
 * If a slot type is added to `ContentSlot`, both functions need updating —
 * the cost of keeping the two derivations explicit.
 */
export function buildSlotSchema(
  slots: Record<string, ContentSlot>,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, slot] of Object.entries(slots)) {
    let base: z.ZodTypeAny;
    switch (slot.type) {
      case "string":
        base =
          slot.maxLength !== undefined
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
    if (slot.description) {
      base = base.describe(slot.description);
    }
    shape[key] = base.optional();
  }
  return z.object(shape);
}
