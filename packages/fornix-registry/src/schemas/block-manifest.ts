import { z } from "zod";

// ── Sub-schemas ───────────────────────────────────────────

const BlockFileSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  condition: z.string().optional(),
});

const EnvVarSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
});

const ContentSlotSchema = z.object({
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  example: z.unknown().optional(),
  items: z.record(z.unknown()).optional(),
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().positive().optional(),
});

const BlockCollectionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["data", "content"]),
  schemaSource: z.string().min(1),
});

const BlockAIMetadataSchema = z.object({
  whenToUse: z.string().min(1),
  whenNotToUse: z.string().min(1),
  pairsWith: z.array(z.string()),
  contentSlots: z.record(ContentSlotSchema).optional(),
});

// ── Main Schema ───────────────────────────────────────────

export const BlockManifestSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string().regex(
    /^[a-z][a-z0-9-]*$/,
    "Block name must be kebab-case, starting with a lowercase letter (regex: ^[a-z][a-z0-9-]*$)"
  ),
  version: z.string().min(1),
  type: z.enum(["section", "integration", "feature", "layout"]),
  description: z.string().min(1).max(200),
  category: z.string().min(1),
  tags: z.array(z.string()),

  dependencies: z.record(z.string()),
  requires: z.array(z.string()),
  conflicts: z.array(z.string()),

  requiredMode: z.enum(["static", "hybrid", "server"]).optional(),
  envVars: z.array(EnvVarSchema),
  variants: z.array(z.string()),
  slots: z.array(z.string()),

  files: z.array(BlockFileSchema),
  collections: z.array(BlockCollectionSchema).optional(),

  ai: BlockAIMetadataSchema.optional(),
});

// ── Derived Type ──────────────────────────────────────────

export type BlockManifest = z.infer<typeof BlockManifestSchema>;

// ── Sub-types (exported for consumers) ────────────────────

export type BlockFile = z.infer<typeof BlockFileSchema>;
export type BlockEnvVar = z.infer<typeof EnvVarSchema>;
export type BlockAIMetadata = z.infer<typeof BlockAIMetadataSchema>;
export type ContentSlot = z.infer<typeof ContentSlotSchema>;
export type BlockCollection = z.infer<typeof BlockCollectionSchema>;
