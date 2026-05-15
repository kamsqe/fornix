import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../../src/ai/prompt-builder.js";
import {
  FIXTURE_MANIFESTS,
} from "../../src/cli/fixture-registry.js";
import type { ResolvedConfig } from "../../src/schemas/config.js";

describe("Prompt Builder", () => {
  const blocks = FIXTURE_MANIFESTS;

  it("should generate a valid system prompt", () => {
    const prompt = buildSystemPrompt({
      blocks,
      palettes: [],
    });

    expect(prompt).toContain("You are the Fornix AI assistant.");
    expect(prompt).toContain("# Available Blocks");
    // Project config was removed from prompt-builder
  });

  it("should include block details in the registry section", () => {
    const prompt = buildSystemPrompt({
      blocks,
      palettes: [],
    });

    const heroBlock = FIXTURE_MANIFESTS["hero-gradient"];
    expect(heroBlock).toBeDefined();
    if (heroBlock) {
      expect(prompt).toContain(heroBlock.name);
      expect(prompt).toContain(heroBlock.description);
    }
  });

  it("should format content slots correctly", () => {
    const prompt = buildSystemPrompt({
      blocks,
      palettes: [],
    });

    const heroBlock = FIXTURE_MANIFESTS["hero-gradient"];
    expect(heroBlock?.ai?.contentSlots).toBeDefined();

    expect(prompt).toContain("`headline` (string)");
    expect(prompt).toContain("`subheadline` (string)");
  });
});
