/**
 * AI prompt construction — unit tests for the deterministic parts.
 *
 * The actual API call is exercised by `tests/e2e/anthropic.test.ts`
 * (skipped without ANTHROPIC_API_KEY). Here we cover:
 *   - archetype-specific system-prompt guidance lands in the right
 *     branch and absent when no archetype is set
 *   - block prompt includes brand + archetype + slot constraints
 */
import { describe, it, expect } from "vitest";

import { __internals } from "../../src/ai/providers/anthropic.js";
import type { CopyRequest } from "../../src/ai/provider.js";

const { buildSystemPrompt, buildBlockPrompt } = __internals;

function makeRequest(
  overrides: Partial<CopyRequest> = {},
): CopyRequest {
  return {
    blockName: "hero-text",
    blockDescription: "Text-first hero with eyebrow, headline, subhead, CTAs.",
    slots: {
      headline: {
        type: "string",
        description: "Primary message.",
        maxLength: 90,
        example: "Calendars that protect deep work",
      },
    },
    brand: {
      name: "Helix",
      description: "Calendar app",
      tone: "direct, technical",
      industry: "developer productivity",
    },
    locale: "en",
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes the base instructions when no archetype is supplied", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("marketing copy for website sections");
    expect(prompt).toContain("maxLength is a hard limit");
    expect(prompt).not.toContain("SaaS product site");
    expect(prompt).not.toContain("agency / studio");
    expect(prompt).not.toContain("strength-training");
  });

  it("adds saas-specific guidance when archetype=saas", () => {
    const prompt = buildSystemPrompt("saas");
    expect(prompt).toContain("SaaS product site");
    expect(prompt).toContain("streamline"); // banned-word list mention
    expect(prompt).not.toContain("agency / studio");
  });

  it("adds agency guidance when archetype=agency", () => {
    const prompt = buildSystemPrompt("agency");
    expect(prompt).toContain("agency / studio");
    expect(prompt).toContain("editorial");
    expect(prompt).not.toContain("SaaS product site");
  });

  it("adds portfolio guidance when archetype=portfolio", () => {
    const prompt = buildSystemPrompt("portfolio");
    expect(prompt).toContain("personal-portfolio");
    expect(prompt).toContain("first-person");
  });

  it("adds gym guidance when archetype=gym", () => {
    const prompt = buildSystemPrompt("gym");
    expect(prompt).toContain("strength-training");
    expect(prompt).toContain("real lifts");
  });

  it("adds restaurant guidance when archetype=restaurant", () => {
    const prompt = buildSystemPrompt("restaurant");
    expect(prompt).toContain("restaurant");
    expect(prompt).toContain("sensory");
  });
});

describe("buildBlockPrompt", () => {
  it("includes brand fields", () => {
    const prompt = buildBlockPrompt(makeRequest());
    expect(prompt).toContain("Brand: Helix");
    expect(prompt).toContain("Description: Calendar app");
    expect(prompt).toContain("Tone: direct, technical");
    expect(prompt).toContain("Industry: developer productivity");
  });

  it("includes the archetype line when archetype is set on brand", () => {
    const prompt = buildBlockPrompt(
      makeRequest({
        brand: { ...makeRequest().brand, archetype: "saas" },
      }),
    );
    expect(prompt).toContain("Archetype: saas");
  });

  it("omits the archetype line when archetype is unset", () => {
    const prompt = buildBlockPrompt(makeRequest());
    expect(prompt).not.toContain("Archetype:");
  });

  it("includes the audience line when audience is set", () => {
    const prompt = buildBlockPrompt(
      makeRequest({
        brand: { ...makeRequest().brand, audience: "engineering managers" },
      }),
    );
    expect(prompt).toContain("Audience: engineering managers");
  });

  it("emits slot constraints (maxLength, example) in the schema lines", () => {
    const prompt = buildBlockPrompt(makeRequest());
    expect(prompt).toContain("headline");
    expect(prompt).toContain("maxLength: 90");
    expect(prompt).toContain("example: ");
    expect(prompt).toContain("Calendars that protect deep work");
  });

  it("includes the locale and section purpose", () => {
    const prompt = buildBlockPrompt(makeRequest({ locale: "es" }));
    expect(prompt).toContain("Locale: es");
    expect(prompt).toContain("Section: hero-text");
    expect(prompt).toContain("Section purpose: Text-first hero");
  });
});
