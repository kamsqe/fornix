import type { BlockManifest } from "fornix-registry";
import { FIXTURE_MANIFESTS } from "../../cli/fixture-registry.js";
import { ok, type Result } from "../../utils/result.js";

// ── Input ───────────────────────────────────────────────────

export interface ListBlocksInput {
  readonly type?: string;
  readonly category?: string;
  readonly search?: string;
}

// ── Output ──────────────────────────────────────────────────

export interface ListBlocksEntry {
  readonly name: string;
  readonly type: string;
  readonly category: string;
  readonly description: string;
  readonly tags: ReadonlyArray<string>;
  readonly requiredMode?: string;
  readonly requires: ReadonlyArray<string>;
}

// ── Implementation ──────────────────────────────────────────

export function listBlocks(
  input: ListBlocksInput,
): Result<ReadonlyArray<ListBlocksEntry>, Error> {
  let blocks: ReadonlyArray<BlockManifest> = Object.values(FIXTURE_MANIFESTS);

  if (input.type) {
    const filterType = input.type.toLowerCase();
    blocks = blocks.filter((block) => block.type === filterType);
  }

  if (input.category) {
    const filterCategory = input.category.toLowerCase();
    blocks = blocks.filter((block) => block.category === filterCategory);
  }

  if (input.search) {
    const searchTerm = input.search.toLowerCase();
    blocks = blocks.filter(
      (block) =>
        block.name.includes(searchTerm) ||
        block.description.toLowerCase().includes(searchTerm) ||
        block.tags.some((tag) => tag.includes(searchTerm)),
    );
  }

  const entries: ListBlocksEntry[] = blocks
    .map((block) => ({
      name: block.name,
      type: block.type,
      category: block.category,
      description: block.description,
      tags: block.tags,
      requiredMode: block.requiredMode,
      requires: block.requires,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return ok(entries);
}
