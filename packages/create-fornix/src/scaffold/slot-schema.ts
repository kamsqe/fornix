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
        base = buildArrayItemSchema(slot.items);
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

/**
 * Read the optional `items` field of an `array` slot to figure out whether
 * the array holds primitives or object records.
 *
 * Two conventions, both used in `block.json` manifests:
 *   `items: { type: "string" }`        → array of strings
 *   `items: { icon: {type:"string"},   → array of objects with those fields
 *             title: {type:"string"} }`
 */
function buildArrayItemSchema(
  items: ContentSlot["items"],
): z.ZodTypeAny {
  if (!items) return z.array(z.record(z.unknown()));

  // Convention 1: items declares a single primitive shape via top-level `type`.
  if (typeof items.type === "string") {
    switch (items.type) {
      case "string":
        return z.array(z.string());
      case "number":
        return z.array(z.number());
      case "boolean":
        return z.array(z.boolean());
      default:
        return z.array(z.record(z.unknown()));
    }
  }

  // Convention 2: items is a record of field specs (each value has its own
  // `type`). Wrap as `z.array(z.record(z.unknown()))` — full per-field
  // validation would require recursive ContentSlot parsing of `items`'s
  // record, which the schema doesn't currently model.
  return z.array(z.record(z.unknown()));
}
