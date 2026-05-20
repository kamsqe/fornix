/**
 * Archetype matcher — pure-logic unit tests.
 *
 * `matchArchetype()` itself hits the Anthropic API and is exercised by
 * the live e2e test (skipped without ANTHROPIC_API_KEY). Here we cover
 * the deterministic post-processing: confidence-threshold fallback and
 * the BrandContext projection.
 */
import { describe, it, expect } from "vitest";

import {
  resolveMatch,
  brandFromMatch,
  ArchetypeMatchSchema,
  ARCHETYPE_NAMES,
  type ArchetypeMatch,
  type ProviderKind,
} from "../../src/ai/archetype-matcher.js";

function makeMatch(overrides: Partial<ArchetypeMatch> = {}): ArchetypeMatch {
  return {
    archetype: "saas",
    reasoning: "Sample reasoning",
    confidence: 0.9,
    brand: {
      name: "Sample",
      description: "Sample description",
      tone: "clear, professional",
      industry: "developer tools",
      audience: "engineers",
    },
    ...overrides,
  };
}

describe("ARCHETYPE_NAMES", () => {
  it("matches the 5 archetypes shipped in v0.3", () => {
    expect([...ARCHETYPE_NAMES].sort()).toEqual([
      "agency",
      "gym",
      "portfolio",
      "restaurant",
      "saas",
    ]);
  });
});

describe("ProviderKind", () => {
  it("admits the two supported providers", () => {
    // Compile-time check materialized as a runtime assertion: the union
    // narrows to exactly "anthropic" | "google". Anything else fails to
    // assign without a cast.
    const kinds: ProviderKind[] = ["anthropic", "google"];
    expect(kinds.length).toBe(2);
  });
});

describe("ArchetypeMatchSchema", () => {
  it("accepts a well-formed match", () => {
    const parsed = ArchetypeMatchSchema.safeParse(makeMatch());
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown archetype", () => {
    const parsed = ArchetypeMatchSchema.safeParse({
      ...makeMatch(),
      archetype: "ecommerce",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const parsed = ArchetypeMatchSchema.safeParse({
      ...makeMatch(),
      confidence: 1.5,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty brand.name", () => {
    const parsed = ArchetypeMatchSchema.safeParse({
      ...makeMatch(),
      brand: { ...makeMatch().brand, name: "" },
    });
    expect(parsed.success).toBe(false);
  });

  it("allows brand.audience to be omitted", () => {
    const { audience: _audience, ...brandWithoutAudience } = makeMatch().brand;
    const parsed = ArchetypeMatchSchema.safeParse({
      ...makeMatch(),
      brand: brandWithoutAudience,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("resolveMatch", () => {
  it("uses the matched archetype above the confidence threshold", () => {
    const result = resolveMatch(makeMatch({ archetype: "gym", confidence: 0.85 }));
    expect(result).toEqual({ archetype: "gym", fellBack: false });
  });

  it("falls back to saas when confidence is below threshold", () => {
    const result = resolveMatch(makeMatch({ archetype: "gym", confidence: 0.2 }));
    expect(result).toEqual({ archetype: "saas", fellBack: true });
  });

  it("uses the matched archetype exactly at the threshold (0.4)", () => {
    const result = resolveMatch(makeMatch({ archetype: "portfolio", confidence: 0.4 }));
    expect(result.archetype).toBe("portfolio");
    expect(result.fellBack).toBe(false);
  });

  it("respects every archetype name when confidence is high", () => {
    for (const name of ARCHETYPE_NAMES) {
      const result = resolveMatch(makeMatch({ archetype: name, confidence: 0.9 }));
      expect(result).toEqual({ archetype: name, fellBack: false });
    }
  });
});

describe("brandFromMatch", () => {
  it("projects the matcher brand onto BrandContext shape and carries the archetype through", () => {
    const match = makeMatch({
      archetype: "saas",
      brand: {
        name: "Helix",
        description: "Calendar that protects deep work",
        tone: "direct, technical, slightly opinionated",
        industry: "developer productivity",
        audience: "engineering managers",
      },
    });
    expect(brandFromMatch(match)).toEqual({
      name: "Helix",
      description: "Calendar that protects deep work",
      tone: "direct, technical, slightly opinionated",
      industry: "developer productivity",
      audience: "engineering managers",
      archetype: "saas",
    });
  });

  it("leaves audience undefined when the matcher omits it", () => {
    const match = makeMatch();
    const { audience: _audience, ...brandWithoutAudience } = match.brand;
    const result = brandFromMatch({ ...match, brand: brandWithoutAudience });
    expect(result.audience).toBeUndefined();
    expect(result.name).toBe(match.brand.name);
  });
});
