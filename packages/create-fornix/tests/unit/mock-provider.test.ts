import { describe, it, expect } from "vitest";
import {
  createMockProvider,
  loadFixture,
  listFixtureNames,
} from "../../src/ai/providers/mock-provider.js";
import { IntentSchema } from "../../src/ai/rules.js";

// ── Tests ────────────────────────────────────────────────

describe("mock-provider", () => {
  describe("createMockProvider", () => {
    it("returns fixture response for 'fintech' prompt", async () => {
      const provider = createMockProvider();
      const result = await provider.generate(
        "I want to build a fintech landing page for my new banking app",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.siteType).toBe("landing-page");
        expect(result.value.industry).toBe("fintech");
        expect(result.value.needsAuth).toBe(true);
        expect(result.value.needsPayments).toBe(true);
      }
    });

    it("returns fixture response for 'blog' prompt", async () => {
      const provider = createMockProvider();
      const result = await provider.generate(
        "I want a personal blog about travel",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.siteType).toBe("blog");
        expect(result.value.needsBlog).toBe(true);
        expect(result.value.needsAuth).toBe(false);
      }
    });

    it("returns fixture response for 'saas' prompt", async () => {
      const provider = createMockProvider();
      const result = await provider.generate(
        "Build a SaaS project management dashboard",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.siteType).toBe("saas");
        expect(result.value.needsDashboard).toBe(true);
        expect(result.value.wantsThemeSwitcher).toBe(true);
      }
    });

    it("returns fixture response for 'agency' prompt", async () => {
      const provider = createMockProvider();
      const result = await provider.generate(
        "Create a multilingual design agency website",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.siteType).toBe("agency");
        expect(result.value.languages.length).toBe(3);
        expect(result.value.visualStyle).toBe("glassmorphism");
      }
    });

    it("returns fixture response for 'portfolio' prompt", async () => {
      const provider = createMockProvider();
      const result = await provider.generate(
        "I need a portfolio site as a freelance developer",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.siteType).toBe("portfolio");
        expect(result.value.visualStyle).toBe("neo-brutalist");
      }
    });

    it("returns error for unknown prompt", async () => {
      const provider = createMockProvider();
      const result = await provider.generate(
        "Build me a spaceship control panel for Mars colonization",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("ProviderError");
        expect(result.error.message).toContain("No fixture matched");
      }
    });

    it("provider has name 'mock'", () => {
      const provider = createMockProvider();
      expect(provider.name).toBe("mock");
    });
  });

  describe("fixture validation", () => {
    it("all fixture responses parse against IntentSchema", () => {
      const names = listFixtureNames();
      expect(names.length).toBe(5);

      for (const name of names) {
        const fixture = loadFixture(name);
        const result = IntentSchema.safeParse(fixture);
        expect(result.success).toBe(true);
      }
    });

    it("fintech-landing fixture has correct structure", () => {
      const fixture = loadFixture("fintech-landing");
      expect(fixture.brand.name).toBe("FinVault");
      expect(fixture.recommendedBlocks.length).toBeGreaterThan(0);
      expect(fixture.overallConfidence).toBeGreaterThan(0);
      expect(fixture.overallConfidence).toBeLessThanOrEqual(1);
    });

    it("multilingual-agency fixture has multiple languages", () => {
      const fixture = loadFixture("multilingual-agency");
      expect(fixture.languages.length).toBeGreaterThanOrEqual(2);
      expect(fixture.languages).toContain("en");
      expect(fixture.languages).toContain("fr");
    });
  });
});
