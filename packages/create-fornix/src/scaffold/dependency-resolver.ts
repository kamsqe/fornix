import type { BlockManifest } from "fornix-registry";
import { ok, err, type Result } from "../utils/result.js";
import type {
  CircularDependencyError,
  DependencyConflictError,
  BlockNotFoundError,
} from "../errors.js";

// ── Error Union ───────────────────────────────────────────

type DependencyError =
  | CircularDependencyError
  | DependencyConflictError
  | BlockNotFoundError;

// ── Public API ────────────────────────────────────────────

export function resolveDependencies(
  selected: ReadonlyArray<string>,
  manifests: Readonly<Record<string, BlockManifest>>
): Result<string[], DependencyError> {
  // Deduplicate
  const unique = [...new Set(selected)];

  // Verify all selected blocks exist
  for (const name of unique) {
    if (!(name in manifests)) {
      return err({
        kind: "BlockNotFoundError",
        message: `Block '${name}' not found in registry`,
        blockName: name,
      });
    }
  }

  // Collect all blocks (selected + transitive deps)
  const allBlocks = new Set<string>();
  const collectError = collectTransitiveDependencies(
    unique,
    manifests,
    allBlocks,
    new Set()
  );
  if (collectError !== undefined) {
    return err(collectError);
  }

  // Check conflicts
  const conflictError = detectConflicts(allBlocks, manifests);
  if (conflictError !== undefined) {
    return err(conflictError);
  }

  // Topological sort
  const sortResult = topologicalSort(allBlocks, manifests);
  if (sortResult === undefined) {
    // This shouldn't happen since we already checked for cycles,
    // but handle it defensively
    return err({
      kind: "CircularDependencyError",
      message: "Unexpected circular dependency detected during sort",
      chain: [],
    });
  }

  return ok(sortResult);
}

// ── Transitive Dependency Collection ──────────────────────

function collectTransitiveDependencies(
  blocks: ReadonlyArray<string>,
  manifests: Readonly<Record<string, BlockManifest>>,
  collected: Set<string>,
  visiting: Set<string>
): DependencyError | undefined {
  for (const name of blocks) {
    if (collected.has(name)) {
      continue;
    }

    if (visiting.has(name)) {
      return {
        kind: "CircularDependencyError",
        message: `Circular dependency detected involving '${name}'`,
        chain: [...visiting, name],
      };
    }

    if (!(name in manifests)) {
      return {
        kind: "BlockNotFoundError",
        message: `Block '${name}' not found in registry (required as dependency)`,
        blockName: name,
      };
    }

    visiting.add(name);

    const manifest = manifests[name];
    if (manifest.requires.length > 0) {
      const depError = collectTransitiveDependencies(
        manifest.requires,
        manifests,
        collected,
        visiting
      );
      if (depError !== undefined) {
        return depError;
      }
    }

    visiting.delete(name);
    collected.add(name);
  }

  return undefined;
}

// ── Conflict Detection ────────────────────────────────────

function detectConflicts(
  blocks: ReadonlySet<string>,
  manifests: Readonly<Record<string, BlockManifest>>
): DependencyConflictError | undefined {
  for (const name of blocks) {
    const manifest = manifests[name];
    for (const conflicting of manifest.conflicts) {
      if (blocks.has(conflicting)) {
        return {
          kind: "DependencyConflictError",
          message: `Block '${name}' conflicts with '${conflicting}'`,
          blockA: name,
          blockB: conflicting,
        };
      }
    }
  }
  return undefined;
}

// ── Topological Sort (Kahn's Algorithm) ───────────────────

function topologicalSort(
  blocks: ReadonlySet<string>,
  manifests: Readonly<Record<string, BlockManifest>>
): string[] | undefined {
  // Build in-degree map and adjacency list
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const name of blocks) {
    if (!inDegree.has(name)) {
      inDegree.set(name, 0);
    }
    if (!dependents.has(name)) {
      dependents.set(name, []);
    }
  }

  for (const name of blocks) {
    const manifest = manifests[name];
    for (const dep of manifest.requires) {
      if (blocks.has(dep)) {
        inDegree.set(name, (inDegree.get(name) ?? 0) + 1);
        const list = dependents.get(dep) ?? [];
        list.push(name);
        dependents.set(dep, list);
      }
    }
  }

  // Collect nodes with zero in-degree
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const dependent of dependents.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }

  // If not all nodes processed, there's a cycle
  if (sorted.length !== blocks.size) {
    return undefined;
  }

  return sorted;
}
