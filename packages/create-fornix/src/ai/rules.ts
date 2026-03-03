/**
 * Rules Engine — deterministic rules that don't need AI.
 *
 * Runs on an Intent object (structured output from AI or manual input)
 * and mutates a MutableConfig to apply unambiguous decisions.
 *
 * Rules are idempotent: applying the same rules twice produces the same result.
 */

import { z } from "zod";

// ── Intent Schema ────────────────────────────────────────

export const IntentSchema = z.object({
  siteType: z.enum([
    "landing-page",
    "saas",
    "agency",
    "portfolio",
    "blog",
    "docs",
    "ecommerce",
    "dashboard",
    "community",
    "other",
  ]),
  industry: z.string(),
  brand: z.object({
    name: z.string(),
    tagline: z.string().optional(),
    description: z.string(),
    targetAudience: z.string().optional(),
    tone: z.string(),
  }),
  needsAuth: z.boolean(),
  needsPayments: z.boolean(),
  needsBlog: z.boolean(),
  needsDocs: z.boolean(),
  needsDashboard: z.boolean(),
  needsContactForm: z.boolean(),
  needsNewsletter: z.boolean(),
  hasDynamicContent: z.boolean(),
  hasEcommerce: z.boolean(),
  hasUserAccounts: z.boolean(),
  prefersDarkMode: z.boolean(),
  visualStyle: z.enum([
    "minimal",
    "bold",
    "glassmorphism",
    "gradient",
    "flat",
    "neo-brutalist",
  ]),
  languages: z.array(z.string()),
  palettePreference: z.enum([
    "custom",
    "prebuilt",
    "ai-generated",
    "unspecified",
  ]),
  wantsThemeSwitcher: z.boolean(),
  recommendedBlocks: z.array(
    z.object({
      blockName: z.string(),
      reason: z.string(),
      confidence: z.number(),
    }),
  ),
  uncertainties: z.array(
    z.object({
      topic: z.string(),
      question: z.string(),
      defaultAssumption: z.string(),
    }),
  ),
  overallConfidence: z.number().min(0).max(1),
});

export type Intent = z.infer<typeof IntentSchema>;

// ── MutableConfig ────────────────────────────────────────

export interface MutableConfig {
  renderMode: "static" | "hybrid" | "server";
  deployTarget: "cloudflare" | "vercel" | "netlify" | "static";
  database: "none" | "d1" | "turso" | "astro-db" | "postgres";
  blocks: Array<{ name: string; variant: string }>;
  locales: string[];
  defaultLocale: string;
  themeSwitcher: boolean;
}

// ── Rule Type ────────────────────────────────────────────

interface Rule {
  readonly name: string;
  readonly apply: (intent: Readonly<Intent>, config: MutableConfig) => void;
}

// ── Individual Rules ─────────────────────────────────────

function hasBlock(config: MutableConfig, name: string): boolean {
  return config.blocks.some((b) => b.name === name);
}

function addBlock(config: MutableConfig, name: string): void {
  if (!hasBlock(config, name)) {
    config.blocks.push({ name, variant: "default" });
  }
}

const authRule: Rule = {
  name: "auth",
  apply(intent, config) {
    if (intent.needsAuth || intent.hasUserAccounts) {
      config.renderMode = "server";
      addBlock(config, "db-d1");
      addBlock(config, "auth-better-auth");
    }
  },
};

const paymentsRule: Rule = {
  name: "payments",
  apply(intent, config) {
    if (intent.needsPayments || intent.hasEcommerce) {
      if (config.renderMode === "static") {
        config.renderMode = "hybrid";
      }
      addBlock(config, "payments-stripe");
    }
  },
};

const blogRule: Rule = {
  name: "blog",
  apply(intent, config) {
    if (intent.needsBlog && !intent.hasDynamicContent) {
      config.renderMode = "static";
      addBlock(config, "blog-mdx");
    }
  },
};

const cloudflareAnalyticsRule: Rule = {
  name: "cloudflare-analytics",
  apply(_intent, config) {
    if (config.deployTarget === "cloudflare") {
      addBlock(config, "analytics-cf");
    }
  },
};

const i18nRule: Rule = {
  name: "i18n",
  apply(intent, config) {
    if (intent.languages.length >= 2) {
      config.locales = [...intent.languages];
      config.defaultLocale = intent.languages[0] as string;
    }
  },
};

const themeSwitcherRule: Rule = {
  name: "theme-switcher",
  apply(intent, config) {
    if (intent.wantsThemeSwitcher) {
      config.themeSwitcher = true;
      addBlock(config, "theme-switcher");
    }
  },
};

// ── Rules Registry (ordered) ─────────────────────────────

const RULES: ReadonlyArray<Rule> = [
  authRule,
  paymentsRule,
  blogRule,
  cloudflareAnalyticsRule,
  i18nRule,
  themeSwitcherRule,
];

// ── Public API ───────────────────────────────────────────

/**
 * Apply all deterministic rules to the mutable config based on the intent.
 * Rules are idempotent — calling applyRules twice has the same effect as once.
 */
export function applyRules(
  intent: Readonly<Intent>,
  config: MutableConfig,
): void {
  for (const rule of RULES) {
    rule.apply(intent, config);
  }
}

/**
 * Create a fresh MutableConfig with sensible defaults.
 */
export function createDefaultConfig(
  overrides: Partial<MutableConfig> = {},
): MutableConfig {
  return {
    renderMode: "static",
    deployTarget: "cloudflare",
    database: "none",
    blocks: [],
    locales: ["en"],
    defaultLocale: "en",
    themeSwitcher: false,
    ...overrides,
  };
}
