import { describe, it, expect } from "vitest";
import { IntentSchema } from "../../src/ai/schemas";

// ── Fixtures ──────────────────────────────────────────────

const validFintechIntent = {
  siteType: "landing-page" as const,
  industry: "fintech",
  brand: {
    name: "PayFlow",
    tagline: "Payments made simple",
    description: "A modern payment processing platform",
    targetAudience: "Small businesses and freelancers",
    tone: "professional",
  },
  needsAuth: false,
  needsPayments: true,
  needsBlog: false,
  needsDocs: false,
  needsDashboard: false,
  needsContactForm: true,
  needsNewsletter: true,
  hasDynamicContent: false,
  hasEcommerce: false,
  hasUserAccounts: false,
  prefersDarkMode: true,
  visualStyle: "gradient" as const,
  languages: [],
  palettePreference: "prebuilt" as const,
  wantsThemeSwitcher: false,
  recommendedBlocks: [
    { blockName: "hero-gradient", reason: "Fintech landing needs a bold hero", confidence: 0.95 },
    { blockName: "pricing-table", reason: "Payment platform needs pricing", confidence: 0.9 },
    { blockName: "cta-banner", reason: "Drive conversions", confidence: 0.85 },
  ],
  uncertainties: [
    {
      topic: "integrations",
      question: "Do you need Stripe payment integration on the landing page?",
      defaultAssumption: "No, landing page only",
    },
  ],
  overallConfidence: 0.88,
};

const validSaasIntent = {
  siteType: "saas" as const,
  industry: "project-management",
  brand: {
    name: "TaskHive",
    description: "Collaborative project management for remote teams",
    tone: "friendly",
  },
  needsAuth: true,
  needsPayments: true,
  needsBlog: true,
  needsDocs: true,
  needsDashboard: true,
  needsContactForm: false,
  needsNewsletter: false,
  hasDynamicContent: true,
  hasEcommerce: false,
  hasUserAccounts: true,
  prefersDarkMode: false,
  visualStyle: "minimal" as const,
  languages: ["en", "es"],
  palettePreference: "ai-generated" as const,
  wantsThemeSwitcher: true,
  recommendedBlocks: [
    { blockName: "auth-better-auth", reason: "SaaS needs authentication", confidence: 0.98 },
    { blockName: "db-d1", reason: "User data storage", confidence: 0.97 },
    { blockName: "layout-dashboard", reason: "Dashboard UI needed", confidence: 0.95 },
  ],
  uncertainties: [],
  overallConfidence: 0.92,
};

// ── Tests ─────────────────────────────────────────────────

describe("IntentSchema", () => {
  // ── Happy Path ──

  it("parses a valid fintech landing page intent", () => {
    const result = IntentSchema.safeParse(validFintechIntent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.siteType).toBe("landing-page");
      expect(result.data.industry).toBe("fintech");
      expect(result.data.needsPayments).toBe(true);
      expect(result.data.recommendedBlocks).toHaveLength(3);
    }
  });

  it("parses a valid SaaS dashboard intent with needsAuth and needsDashboard", () => {
    const result = IntentSchema.safeParse(validSaasIntent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.needsAuth).toBe(true);
      expect(result.data.needsDashboard).toBe(true);
      expect(result.data.hasUserAccounts).toBe(true);
      expect(result.data.languages).toEqual(["en", "es"]);
      expect(result.data.wantsThemeSwitcher).toBe(true);
    }
  });

  // ── languages defaults ──

  it("defaults languages to empty array when not provided", () => {
    const { languages: _, ...withoutLanguages } = validFintechIntent;
    const result = IntentSchema.safeParse(withoutLanguages);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.languages).toEqual([]);
    }
  });

  // ── overallConfidence validation ──

  it("rejects overallConfidence less than 0", () => {
    const result = IntentSchema.safeParse({
      ...validFintechIntent,
      overallConfidence: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects overallConfidence greater than 1", () => {
    const result = IntentSchema.safeParse({
      ...validFintechIntent,
      overallConfidence: 1.1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts overallConfidence at exactly 0", () => {
    const result = IntentSchema.safeParse({
      ...validFintechIntent,
      overallConfidence: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts overallConfidence at exactly 1", () => {
    const result = IntentSchema.safeParse({
      ...validFintechIntent,
      overallConfidence: 1,
    });
    expect(result.success).toBe(true);
  });

  // ── recommendedBlocks[].confidence validation ──

  it("rejects recommendedBlock confidence less than 0", () => {
    const result = IntentSchema.safeParse({
      ...validFintechIntent,
      recommendedBlocks: [
        { blockName: "hero-gradient", reason: "test", confidence: -0.5 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects recommendedBlock confidence greater than 1", () => {
    const result = IntentSchema.safeParse({
      ...validFintechIntent,
      recommendedBlocks: [
        { blockName: "hero-gradient", reason: "test", confidence: 1.5 },
      ],
    });
    expect(result.success).toBe(false);
  });

  // ── siteType validation ──

  it("rejects invalid siteType", () => {
    const result = IntentSchema.safeParse({
      ...validFintechIntent,
      siteType: "social-network",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid siteType values", () => {
    const types = [
      "landing-page", "saas", "agency", "portfolio", "blog",
      "docs", "ecommerce", "dashboard", "community", "other",
    ];
    for (const siteType of types) {
      const result = IntentSchema.safeParse({ ...validFintechIntent, siteType });
      expect(result.success).toBe(true);
    }
  });

  // ── visualStyle validation ──

  it("accepts all valid visualStyle values", () => {
    const styles = ["minimal", "bold", "glassmorphism", "gradient", "flat", "neo-brutalist"];
    for (const visualStyle of styles) {
      const result = IntentSchema.safeParse({ ...validFintechIntent, visualStyle });
      expect(result.success).toBe(true);
    }
  });

  // ── palettePreference validation ──

  it("accepts all valid palettePreference values", () => {
    const prefs = ["custom", "prebuilt", "ai-generated", "unspecified"];
    for (const palettePreference of prefs) {
      const result = IntentSchema.safeParse({ ...validFintechIntent, palettePreference });
      expect(result.success).toBe(true);
    }
  });

  // ── Optional brand fields ──

  it("does not require optional brand fields (tagline, targetAudience)", () => {
    const result = IntentSchema.safeParse(validSaasIntent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand.tagline).toBeUndefined();
      expect(result.data.brand.targetAudience).toBeUndefined();
    }
  });
});
