import type { BlockManifest, ContentSlot } from "fornix-registry";
import type { ResolvedConfig } from "../schemas/config.js";
import type { FileMap } from "./structure-generator.js";
import { ok, type Result } from "../utils/result.js";

// ── Types ────────────────────────────────────────────────

/**
 * Default content for blocks: maps block name → content object.
 */
export type BlockDefaultContent = Readonly<
  Record<string, Readonly<Record<string, unknown>>>
>;

// ── Content Subdirectory Map ─────────────────────────────

const TYPE_DIRECTORY: Record<string, string> = {
  section: "sections",
  integration: "integrations",
  feature: "features",
  layout: "layouts",
};

// ── Public API ───────────────────────────────────────────

/**
 * Generates `src/content/config.ts` and places default content files
 * for all blocks that declare contentSlots in their AI metadata.
 *
 * - Single locale: content goes to `src/content/{type}/{block}.json`
 * - Multi-locale: content goes to `src/content/{locale}/{type}/{block}.json`
 */
export function wireContent(
  blocks: ReadonlyArray<BlockManifest>,
  defaultContent: BlockDefaultContent,
  config: ResolvedConfig,
): Result<FileMap, Error> {
  const files: FileMap = {};
  const isMultiLocale = config.locales.length >= 2;

  const blocksWithContent = blocks.filter(
    (block) =>
      (block.ai?.contentSlots !== undefined &&
        Object.keys(block.ai.contentSlots).length > 0) ||
      (block.collections !== undefined && block.collections.length > 0)
  );

  if (blocksWithContent.length === 0) {
    return ok(files);
  }

  files["src/content/config.ts"] = generateContentConfig(blocksWithContent);

  for (const block of blocksWithContent) {
    if (!block.ai?.contentSlots || Object.keys(block.ai.contentSlots).length === 0) {
      continue;
    }

    const subdirectory = TYPE_DIRECTORY[block.type] ?? block.type;
    const content = defaultContent[block.name] ?? buildDefaultFromSlots(block.ai.contentSlots);
    const jsonContent = JSON.stringify(content, null, 2) + "\n";

    if (isMultiLocale) {
      for (const locale of config.locales) {
        const path = `src/content/${locale}/${subdirectory}/${block.name}.json`;
        files[path] = jsonContent;
      }
    } else {
      const path = `src/content/${subdirectory}/${block.name}.json`;
      files[path] = jsonContent;
    }
  }

  return ok(files);
}

// ── Content Config Generator ─────────────────────────────

function generateContentConfig(
  blocks: ReadonlyArray<BlockManifest>,
): string {
  const imports = [
    'import { defineCollection, z } from "astro:content";',
  ];

  const collections: string[] = [];
  const dataCollectionNames = new Set<string>();

  for (const block of blocks) {
    // 1. Process custom collections (e.g. blog, docs)
    if (block.collections && block.collections.length > 0) {
      for (const col of block.collections) {
        const importName = `${block.name.replace(/-/g, "")}${col.name}Schema`;
        const importPath = col.schemaSource.replace(/\\.ts$/, "");
        imports.push(`import { schema as ${importName} } from "${importPath}";`);
        
        collections.push(
          `  "${col.name}": defineCollection({\n    type: "${col.type}",\n    schema: ${importName},\n  })`
        );
      }
    }

    // 2. Track data collection names from AI slots
    const slots = block.ai?.contentSlots;
    if (slots && Object.keys(slots).length > 0) {
      const subdirectory = TYPE_DIRECTORY[block.type] ?? block.type;
      dataCollectionNames.add(subdirectory);
    }
  }

  // Generate a single loose schema per data collection.
  // Using z.record(z.unknown()) instead of z.union() avoids schema
  // conflicts when multiple blocks share one collection (e.g. "sections").
  for (const colName of dataCollectionNames) {
    collections.push(
      `  "${colName}": defineCollection({\n    type: "data",\n    schema: z.record(z.unknown()),\n  })`
    );
  }

  const lines = [
    ...imports,
    "",
    "export const collections = {",
    collections.join(",\n"),
    "};",
    "",
  ];

  return lines.join("\n");
}

// ── Zod Type Mapping ─────────────────────────────────────

function zodTypeForSlot(slot: ContentSlot): string {
  switch (slot.type) {
    case "string":
      return "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "array":
      return "z.array(z.unknown())";
    case "object":
      return "z.record(z.unknown())";
  }
}

// ── Default Content Builder ──────────────────────────────

function buildDefaultFromSlots(
  slots: Readonly<Record<string, ContentSlot>>,
): Record<string, unknown> {
  const content: Record<string, unknown> = {};

  for (const [name, slot] of Object.entries(slots)) {
    content[name] = defaultValueForType(slot.type);
  }

  return content;
}

function defaultValueForType(type: ContentSlot["type"]): unknown {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object":
      return {};
  }
}
