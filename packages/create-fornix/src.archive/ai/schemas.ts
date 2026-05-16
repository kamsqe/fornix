import { z } from "zod";

// ── Sub-schemas ───────────────────────────────────────────

const BrandSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().nullable().default(null),
  description: z.string().min(1),
  targetAudience: z.string().nullable().default(null),
  tone: z.string().min(1),
});

const RecommendedBlockSchema = z.object({
  blockName: z.string().min(1),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const UncertaintySchema = z.object({
  topic: z.string().min(1),
  question: z.string().min(1),
  defaultAssumption: z.string().min(1),
});

// ── Main Schema ───────────────────────────────────────────

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
  industry: z.string().min(1),

  brand: BrandSchema,

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

  languages: z.array(z.string().min(1)).default([]),
  palettePreference: z.enum(["custom", "prebuilt", "ai-generated", "unspecified"]),
  wantsThemeSwitcher: z.boolean(),

  recommendedBlocks: z.array(RecommendedBlockSchema),
  uncertainties: z.array(UncertaintySchema),
  overallConfidence: z.number().min(0).max(1),
});

// ── Derived Types ─────────────────────────────────────────

export type Intent = z.infer<typeof IntentSchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type RecommendedBlock = z.infer<typeof RecommendedBlockSchema>;
export type Uncertainty = z.infer<typeof UncertaintySchema>;
