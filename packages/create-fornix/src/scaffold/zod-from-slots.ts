import type { ContentSlot } from "fornix-registry";

/**
 * Convert a `ContentSlot` (from a block's `ai.contentSlots`) into a Zod
 * expression as text — e.g. `z.string().max(80).optional()`.
 *
 * The output is concatenated into the generated `src/content.config.ts`,
 * giving each scaffolded project real per-block content validation instead
 * of the `z.record(z.unknown())` workaround that broke `astro check`.
 */
export function zodExpressionForSlot(slot: ContentSlot): string {
  const base = baseExpressionFor(slot);
  // Every slot is optional at the runtime level — blocks must tolerate missing
  // fields gracefully (the default-content covers the populated case).
  return `${base}.optional()`;
}

function baseExpressionFor(slot: ContentSlot): string {
  switch (slot.type) {
    case "string": {
      let expr = "z.string()";
      if (slot.maxLength !== undefined) {
        expr += `.max(${slot.maxLength})`;
      }
      return expr;
    }
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "array":
      return "z.array(z.record(z.unknown()))";
    case "object":
      return "z.record(z.unknown())";
  }
}

/**
 * Build a single `z.object({...})` expression for one block's slot map.
 */
export function zodObjectForSlots(
  slots: Record<string, ContentSlot>,
): string {
  const entries = Object.entries(slots).map(
    ([key, slot]) => `    ${JSON.stringify(key)}: ${zodExpressionForSlot(slot)}`,
  );
  return `z.object({\n${entries.join(",\n")}\n  })`;
}

/**
 * Merge multiple blocks' slot maps into a single flat map.
 *
 * The merged schema serves as the `sections` collection schema in the
 * generated `content.config.ts`. Every JSON entry under
 * `src/content/sections/` is validated against the same merged schema,
 * so a key declared by any block must be accepted in any file.
 *
 * Conflict policy: when two blocks declare the same key with different
 * types, broaden to `unknown` (lossy but safe). When the type matches
 * but `maxLength` differs, drop the constraint so the most permissive
 * block wins. Day-1 has no real conflicts; this is defense in depth.
 */
export function mergeSlots(
  perBlock: ReadonlyArray<Record<string, ContentSlot>>,
): Record<string, ContentSlot> {
  const merged: Record<string, ContentSlot> = {};
  for (const slots of perBlock) {
    for (const [key, slot] of Object.entries(slots)) {
      const existing = merged[key];
      if (!existing) {
        merged[key] = slot;
        continue;
      }
      if (existing.type !== slot.type) {
        merged[key] = { type: "object" };
        continue;
      }
      // Same type — keep, but drop length/item constraints to satisfy both blocks.
      merged[key] = { type: existing.type };
    }
  }
  return merged;
}
