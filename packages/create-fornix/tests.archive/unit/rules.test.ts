import { describe, it, expect } from "vitest";
import {
  applyRules,
  createDefaultConfig,
  type Intent,
  type MutableConfig,
} from "../../src/ai/rules.js";

// ── Helper ───────────────────────────────────────────────

function baseIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    siteType: "landing-page",
    industry: "technology",
    brand: {
      name: "TestCo",
      tagline: null,
      description: "A test company",
      targetAudience: null,
      tone: "professional",
    },
    needsAuth: false,
    needsPayments: false,
    needsBlog: false,
    needsDocs: false,
    needsDashboard: false,
    needsContactForm: false,
    needsNewsletter: false,
    hasDynamicContent: false,
    hasEcommerce: false,
    hasUserAccounts: false,
    prefersDarkMode: false,
    visualStyle: "minimal",
    languages: ["en"],
    palettePreference: "unspecified",
    wantsThemeSwitcher: false,
    recommendedBlocks: [],
    uncertainties: [],
    overallConfidence: 0.9,
    ...overrides,
  };
}

function blockNames(config: MutableConfig): string[] {
  return config.blocks.map((b) => b.name);
}

// ── Tests ────────────────────────────────────────────────

describe("rules engine", () => {
  describe("auth rule", () => {
    it("needsAuth → renderMode server, auth + db blocks added", () => {
      const config = createDefaultConfig();
      applyRules(baseIntent({ needsAuth: true }), config);

      expect(config.renderMode).toBe("server");
      expect(blockNames(config)).toContain("auth-better-auth");
      expect(blockNames(config)).toContain("db-d1");
    });

    it("hasUserAccounts → same as needsAuth", () => {
      const config = createDefaultConfig();
      applyRules(baseIntent({ hasUserAccounts: true }), config);

      expect(config.renderMode).toBe("server");
      expect(blockNames(config)).toContain("auth-better-auth");
      expect(blockNames(config)).toContain("db-d1");
    });
  });

  describe("payments rule", () => {
    it("needsPayments → renderMode hybrid (if was static), stripe block added", () => {
      const config = createDefaultConfig({ renderMode: "static" });
      applyRules(baseIntent({ needsPayments: true }), config);

      expect(config.renderMode).toBe("hybrid");
      expect(blockNames(config)).toContain("payments-stripe");
    });

    it("hasEcommerce → same as needsPayments", () => {
      const config = createDefaultConfig({ renderMode: "static" });
      applyRules(baseIntent({ hasEcommerce: true }), config);

      expect(config.renderMode).toBe("hybrid");
      expect(blockNames(config)).toContain("payments-stripe");
    });

    it("does not downgrade server to hybrid", () => {
      const config = createDefaultConfig({ renderMode: "server" });
      applyRules(baseIntent({ needsPayments: true }), config);

      expect(config.renderMode).toBe("server");
      expect(blockNames(config)).toContain("payments-stripe");
    });
  });

  describe("blog rule", () => {
    it("needsBlog (no dynamic) → renderMode static, blog-mdx added", () => {
      const config = createDefaultConfig();
      applyRules(
        baseIntent({ needsBlog: true, hasDynamicContent: false }),
        config,
      );

      expect(config.renderMode).toBe("static");
      expect(blockNames(config)).toContain("blog-mdx");
    });

    it("needsBlog with dynamic content → does NOT force static", () => {
      const config = createDefaultConfig({ renderMode: "server" });
      applyRules(
        baseIntent({ needsBlog: true, hasDynamicContent: true }),
        config,
      );

      // blog rule should not fire when hasDynamicContent is true
      expect(config.renderMode).toBe("server");
      expect(blockNames(config)).not.toContain("blog-mdx");
    });
  });

  describe("cloudflare analytics rule", () => {
    it("cloudflare target → analytics-cf added", () => {
      const config = createDefaultConfig({ deployTarget: "cloudflare" });
      applyRules(baseIntent(), config);

      expect(blockNames(config)).toContain("analytics-cf");
    });

    it("non-cloudflare target → analytics-cf NOT added", () => {
      const config = createDefaultConfig({ deployTarget: "vercel" });
      applyRules(baseIntent(), config);

      expect(blockNames(config)).not.toContain("analytics-cf");
    });
  });

  describe("i18n rule", () => {
    it("languages: ['en', 'es'] → locales set, defaultLocale 'en'", () => {
      const config = createDefaultConfig();
      applyRules(baseIntent({ languages: ["en", "es"] }), config);

      expect(config.locales).toEqual(["en", "es"]);
      expect(config.defaultLocale).toBe("en");
    });

    it("single language → locales NOT changed", () => {
      const config = createDefaultConfig();
      applyRules(baseIntent({ languages: ["fr"] }), config);

      expect(config.locales).toEqual(["en"]);
      expect(config.defaultLocale).toBe("en");
    });

    it("three languages → first is default", () => {
      const config = createDefaultConfig();
      applyRules(baseIntent({ languages: ["ar", "en", "fr"] }), config);

      expect(config.locales).toEqual(["ar", "en", "fr"]);
      expect(config.defaultLocale).toBe("ar");
    });
  });

  describe("theme switcher rule", () => {
    it("wantsThemeSwitcher: true → themeSwitcher set, theme-switcher block added", () => {
      const config = createDefaultConfig();
      applyRules(baseIntent({ wantsThemeSwitcher: true }), config);

      expect(config.themeSwitcher).toBe(true);
      expect(blockNames(config)).toContain("theme-switcher");
    });

    it("wantsThemeSwitcher: false → no changes", () => {
      const config = createDefaultConfig();
      applyRules(baseIntent({ wantsThemeSwitcher: false }), config);

      expect(config.themeSwitcher).toBe(false);
      expect(blockNames(config)).not.toContain("theme-switcher");
    });
  });

  describe("idempotency", () => {
    it("applying rules twice produces the same result", () => {
      const intent = baseIntent({
        needsAuth: true,
        needsPayments: true,
        languages: ["en", "es"],
        wantsThemeSwitcher: true,
      });

      const config1 = createDefaultConfig();
      applyRules(intent, config1);

      const config2 = createDefaultConfig();
      applyRules(intent, config2);
      applyRules(intent, config2); // Apply twice

      expect(config2.renderMode).toBe(config1.renderMode);
      expect(config2.deployTarget).toBe(config1.deployTarget);
      expect(config2.locales).toEqual(config1.locales);
      expect(config2.defaultLocale).toBe(config1.defaultLocale);
      expect(config2.themeSwitcher).toBe(config1.themeSwitcher);
      expect(blockNames(config2).sort()).toEqual(blockNames(config1).sort());
      expect(config2.blocks.length).toBe(config1.blocks.length);
    });
  });

  describe("combined rules", () => {
    it("auth + payments → server (auth wins over hybrid)", () => {
      const config = createDefaultConfig();
      applyRules(
        baseIntent({ needsAuth: true, needsPayments: true }),
        config,
      );

      // Auth sets server, payments would set hybrid but server is already higher
      expect(config.renderMode).toBe("server");
      expect(blockNames(config)).toContain("auth-better-auth");
      expect(blockNames(config)).toContain("db-d1");
      expect(blockNames(config)).toContain("payments-stripe");
    });
  });
});
