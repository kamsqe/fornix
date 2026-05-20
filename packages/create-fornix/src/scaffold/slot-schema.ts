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
    // Always emit a description — for AI providers that drive structured
    // output from the schema (Gemini in particular), the description is the
    // ONLY place where length/count limits actually steer generation. Zod's
    // .max()/.maxItems gets translated to JSON-schema constraints that the
    // model often ignores; baking the limit into the prose makes the model
    // self-limit instead of overshooting and getting truncated mid-token.
    const descParts: string[] = [];
    if (slot.description) descParts.push(slot.description);
    if (slot.type === "string" && slot.maxLength !== undefined) {
      descParts.push(`STAY UNDER ${slot.maxLength} characters.`);
    }
    if (slot.type === "array") {
      if (slot.maxItems !== undefined) {
        descParts.push(`Return AT MOST ${slot.maxItems} items.`);
      }
      if (slot.minItems !== undefined) {
        descParts.push(`Return AT LEAST ${slot.minItems} items.`);
      }
    }
    if (descParts.length > 0) {
      base = base.describe(descParts.join(" "));
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
 *
 * Convention 2 is fully expanded into a per-field Zod object so AI providers
 * that derive structured-output schemas (Gemini, in particular) see what
 * fields belong in each item — without this, the model gets `additionalProperties`
 * and either omits the array or hallucinates field names.
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

  // Convention 2: items is a record of field specs. Build a Zod object whose
  // shape matches the declared fields so the AI sees the exact schema.
  const fieldShape: Record<string, z.ZodTypeAny> = {};
  for (const [fieldName, fieldSpec] of Object.entries(
    items as Record<string, { type?: string; description?: string; maxLength?: number }>,
  )) {
    if (!fieldSpec || typeof fieldSpec !== "object") continue;
    let fieldBase: z.ZodTypeAny;
    switch (fieldSpec.type) {
      case "string":
        fieldBase =
          fieldSpec.maxLength !== undefined
            ? z.string().max(fieldSpec.maxLength)
            : z.string();
        break;
      case "number":
        fieldBase = z.number();
        break;
      case "boolean":
        fieldBase = z.boolean();
        break;
      default:
        fieldBase = z.unknown();
    }
    const fieldDesc: string[] = [];
    if (fieldSpec.description) fieldDesc.push(fieldSpec.description);
    if (fieldSpec.type === "string" && fieldSpec.maxLength !== undefined) {
      fieldDesc.push(`STAY UNDER ${fieldSpec.maxLength} characters.`);
    }
    if (fieldDesc.length > 0) {
      fieldBase = fieldBase.describe(fieldDesc.join(" "));
    }
    // Per-item fields are optional too — the AI may not know every value
    // and Zod validation downstream handles missing data via fallback to
    // block defaults.
    fieldShape[fieldName] = fieldBase.optional();
  }
  if (Object.keys(fieldShape).length === 0) {
    return z.array(z.record(z.unknown()));
  }
  return z.array(z.object(fieldShape));
}
