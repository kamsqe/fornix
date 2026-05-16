import { describe, it, expect } from "vitest";
import { resolveDependencies } from "../../src/scaffold/dependency-resolver";
import { isOk, isErr } from "../../src/utils/result";
import type { BlockManifest } from "fornix-registry";

// ── Helper to create minimal manifests ────────────────────

function manifest(
  name: string,
  overrides: Partial<BlockManifest> = {}
): BlockManifest {
  return {
    schemaVersion: 1,
    name,
    version: "1.0.0",
    type: "section",
    description: `Block ${name}`,
    category: "test",
    tags: [],
    dependencies: {},
    requires: [],
    conflicts: [],
    envVars: [],
    variants: ["default"],
    slots: [],
    files: [{ source: `${name}.astro`, destination: `src/components/${name}.astro` }],
    ...overrides,
  };
}

// ── Test Manifests ────────────────────────────────────────

const manifests: Record<string, BlockManifest> = {
  hero: manifest("hero"),
  footer: manifest("footer"),
  pricing: manifest("pricing"),
  auth: manifest("auth", { requires: ["db"], type: "integration" }),
  db: manifest("db", { type: "integration" }),
  dashboard: manifest("dashboard", { requires: ["auth"], type: "feature" }),
  "hero-split": manifest("hero-split", { conflicts: ["hero-gradient"] }),
  "hero-gradient": manifest("hero-gradient", { conflicts: ["hero-split"] }),
  "cycle-a": manifest("cycle-a", { requires: ["cycle-b"] }),
  "cycle-b": manifest("cycle-b", { requires: ["cycle-a"] }),
};

// ── Tests ─────────────────────────────────────────────────

describe("resolveDependencies", () => {
  // ── Flat graph (no deps) ──

  it("returns same blocks for flat graph with no dependencies", () => {
    const result = resolveDependencies(["hero", "footer", "pricing"], manifests);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("hero");
      expect(result.value).toContain("footer");
      expect(result.value).toContain("pricing");
      expect(result.value).toHaveLength(3);
    }
  });

  // ── A requires B → B ordered before A ──

  it("orders dependency before dependent (auth requires db)", () => {
    const result = resolveDependencies(["auth"], manifests);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const dbIndex = result.value.indexOf("db");
      const authIndex = result.value.indexOf("auth");
      expect(dbIndex).toBeLessThan(authIndex);
      expect(result.value).toContain("db"); // auto-included
    }
  });

  // ── Transitive deps (A→B→C) → all 3 included, C first ──

  it("resolves transitive dependencies (dashboard→auth→db)", () => {
    const result = resolveDependencies(["dashboard"], manifests);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain("dashboard");
      expect(result.value).toContain("auth");
      expect(result.value).toContain("db");
      const dbIndex = result.value.indexOf("db");
      const authIndex = result.value.indexOf("auth");
      const dashIndex = result.value.indexOf("dashboard");
      expect(dbIndex).toBeLessThan(authIndex);
      expect(authIndex).toBeLessThan(dashIndex);
    }
  });

  // ── Circular dep → CircularDependencyError ──

  it("detects circular dependencies", () => {
    const result = resolveDependencies(["cycle-a"], manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("CircularDependencyError");
    }
  });

  // ── Conflict → DependencyConflictError ──

  it("detects conflicts between selected blocks", () => {
    const result = resolveDependencies(["hero-split", "hero-gradient"], manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("DependencyConflictError");
    }
  });

  // ── Missing block → BlockNotFoundError ──

  it("returns error when a required block is not in manifests", () => {
    const sparseManifests: Record<string, BlockManifest> = {
      auth: manifest("auth", { requires: ["missing-block"] }),
    };
    const result = resolveDependencies(["auth"], sparseManifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("BlockNotFoundError");
    }
  });

  it("returns error when a selected block is not in manifests", () => {
    const result = resolveDependencies(["nonexistent"], manifests);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("BlockNotFoundError");
    }
  });

  // ── Duplicate selections deduped ──

  it("deduplicates selected blocks", () => {
    const result = resolveDependencies(["hero", "hero", "footer"], manifests);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const heroCount = result.value.filter((name) => name === "hero").length;
      expect(heroCount).toBe(1);
      expect(result.value).toHaveLength(2);
    }
  });

  // ── Mixed: selected + auto-included ──

  it("does not duplicate blocks that are both selected and required by another", () => {
    const result = resolveDependencies(["auth", "db"], manifests);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const dbCount = result.value.filter((name) => name === "db").length;
      expect(dbCount).toBe(1);
    }
  });

  // ── Empty selection ──

  it("returns empty array for empty selection", () => {
    const result = resolveDependencies([], manifests);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual([]);
    }
  });
});
