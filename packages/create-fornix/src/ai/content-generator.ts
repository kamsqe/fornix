/**
 * Multi-Locale Content Generator
 *
 * Generates culturally appropriate content for ALL configured locales.
 * Uses an AI provider (or mock) to produce locale-specific content
 * for each block's content slots, then writes them to locale-specific paths.
 */

import type { BlockManifest, ContentSlot } from "fornix-registry";
import type { AIProvider, ProviderError } from "./providers/mock-provider.js";
import type { Intent } from "./rules.js";
import { ok, err, type Result } from "../utils/result.js";

// ── Types ────────────────────────────────────────────────

export interface ContentGenerationOptions {
  readonly blocks: Readonly<Record<string, BlockManifest>>;
  readonly locales: ReadonlyArray<string>;
  readonly defaultLocale: string;
  readonly brand: Intent["brand"];
  readonly industry: string;
}

/**
 * Maps locale → block name → content object.
 */
export type LocaleContentMap = Readonly<
  Record<string, Readonly<Record<string, Record<string, unknown>>>>
>;

export interface ContentGenerationError {
  readonly kind: "ContentGenerationError";
  readonly message: string;
  readonly locale: string;
  readonly blockName: string;
}

// ── Content File Map ─────────────────────────────────────

const TYPE_DIRECTORY: Record<string, string> = {
  section: "sections",
  integration: "integrations",
  feature: "features",
  layout: "layouts",
};

/**
 * A flat map of file paths → JSON content strings.
 */
export type ContentFileMap = Record<string, string>;

// ── Public API ───────────────────────────────────────────

/**
 * Generate content for all locales and blocks, returning a file map.
 *
 * For each locale and each block with content slots, this function:
 * 1. Calls the AI provider to generate locale-specific content
 * 2. Places content at the correct locale-specific path
 *
 * Single locale:  src/content/{type}/{block}.json
 * Multi locale:   src/content/{locale}/{type}/{block}.json
 */
export async function generateMultiLocaleContent(
  provider: AIProvider,
  options: ContentGenerationOptions,
): Promise<Result<ContentFileMap, ContentGenerationError>> {
  const { blocks, locales, brand, industry } = options;
  const isMultiLocale = locales.length >= 2;

  const blocksWithSlots = Object.values(blocks).filter(
    (block) =>
      block.ai?.contentSlots !== undefined &&
      Object.keys(block.ai.contentSlots).length > 0,
  );

  if (blocksWithSlots.length === 0) {
    return ok({});
  }

  const fileMap: ContentFileMap = {};

  for (const locale of locales) {
    for (const block of blocksWithSlots) {
      const slots = block.ai!.contentSlots!;
      const subdirectory = TYPE_DIRECTORY[block.type] ?? block.type;

      const contentResult = generateBlockContent(
        provider,
        block,
        slots,
        locale,
        brand,
        industry,
      );

      if (!contentResult.ok) {
        return err(contentResult.error);
      }

      const jsonContent = JSON.stringify(contentResult.value, null, 2) + "\n";

      if (isMultiLocale) {
        const path = `src/content/${locale}/${subdirectory}/${block.name}.json`;
        fileMap[path] = jsonContent;
      } else {
        const path = `src/content/${subdirectory}/${block.name}.json`;
        fileMap[path] = jsonContent;
      }
    }
  }

  return ok(fileMap);
}

// ── Block Content Generation ─────────────────────────────

/**
 * Generate content for a single block in a specific locale.
 *
 * Currently uses deterministic locale-specific content generation.
 * In future phases, this will use the AI provider for real content generation
 * via a dedicated content-generation method (not the intent analyzer).
 */
function generateBlockContent(
  _provider: AIProvider,
  _block: BlockManifest,
  slots: Readonly<Record<string, ContentSlot>>,
  locale: string,
  brand: Intent["brand"],
  _industry: string,
): Result<Record<string, unknown>, ContentGenerationError> {
  const content = buildContentFromSlots(slots, locale, brand);
  return ok(content);
}

/**
 * Build locale-specific content for each slot.
 * For the mock provider, this generates deterministic but different
 * content per locale to simulate AI-generated localized content.
 */
function buildContentFromSlots(
  slots: Readonly<Record<string, ContentSlot>>,
  locale: string,
  brand: Intent["brand"],
): Record<string, unknown> {
  const content: Record<string, unknown> = {};

  for (const [name, slot] of Object.entries(slots)) {
    content[name] = localizeSlotValue(name, slot, locale, brand);
  }

  return content;
}

function localizeSlotValue(
  name: string,
  slot: ContentSlot,
  locale: string,
  brand: Intent["brand"],
): unknown {
  switch (slot.type) {
    case "string":
      return localizeString(name, slot, locale, brand);
    case "number":
      return 0;
    case "boolean":
      return false;
    case "array":
      return localizeArray(name, slot, locale, brand);
    case "object":
      return {};
  }
}

// ── Locale-Specific String Generation ────────────────────

const LOCALE_CONTENT: Record<string, Record<string, string>> = {
  en: {
    headline: "Build Something Amazing",
    subheadline: "The fastest way to create modern websites with confidence.",
    ctaText: "Get Started",
    ctaHref: "#get-started",
    badge: "New",
  },
  es: {
    headline: "Construye Algo Increíble",
    subheadline:
      "La forma más rápida de crear sitios web modernos con confianza.",
    ctaText: "Comenzar",
    ctaHref: "#comenzar",
    badge: "Nuevo",
  },
  fr: {
    headline: "Créez Quelque Chose d'Incroyable",
    subheadline:
      "Le moyen le plus rapide de créer des sites web modernes en toute confiance.",
    ctaText: "Commencer",
    ctaHref: "#commencer",
    badge: "Nouveau",
  },
  ar: {
    headline: "ابنِ شيئاً مذهلاً",
    subheadline: "أسرع طريقة لإنشاء مواقع ويب حديثة بثقة.",
    ctaText: "ابدأ الآن",
    ctaHref: "#start",
    badge: "جديد",
  },
  de: {
    headline: "Erschaffen Sie Etwas Großartiges",
    subheadline:
      "Der schnellste Weg, moderne Websites mit Zuversicht zu erstellen.",
    ctaText: "Loslegen",
    ctaHref: "#loslegen",
    badge: "Neu",
  },
  ja: {
    headline: "素晴らしいものを作ろう",
    subheadline: "自信を持ってモダンなウェブサイトを作成する最速の方法。",
    ctaText: "始める",
    ctaHref: "#start",
    badge: "新着",
  },
};

function localizeString(
  name: string,
  slot: ContentSlot,
  locale: string,
  brand: Intent["brand"],
): string {
  // Check for predefined locale content
  const localeMap = LOCALE_CONTENT[locale];
  if (localeMap && localeMap[name]) {
    // Personalize with brand name
    return localeMap[name]!.replace("Something Amazing", brand.name)
      .replace("Algo Increíble", brand.name)
      .replace("Quelque Chose d'Incroyable", brand.name)
      .replace("شيئاً مذهلاً", brand.name)
      .replace("Etwas Großartiges", brand.name)
      .replace("素晴らしいものを作ろう", brand.name);
  }

  // Fallback: use example or locale-tagged placeholder
  if (slot.example && typeof slot.example === "string") {
    return locale === "en"
      ? slot.example
      : `[${locale}] ${slot.example}`;
  }

  return `[${locale}] ${name}`;
}

function localizeArray(
  name: string,
  slot: ContentSlot,
  locale: string,
  brand: Intent["brand"],
): unknown[] {
  if (slot.example && Array.isArray(slot.example)) {
    return (slot.example as unknown[]).map((item) => {
      if (typeof item === "object" && item !== null) {
        const obj = item as Record<string, unknown>;
        const localized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(obj)) {
          if (typeof val === "string") {
            localized[key] = locale === "en" ? val : `[${locale}] ${val}`;
          } else {
            localized[key] = val;
          }
        }
        return localized;
      }
      if (typeof item === "string") {
        return locale === "en" ? item : `[${locale}] ${item}`;
      }
      return item;
    });
  }

  return [];
}

// ── Prompt Builder ───────────────────────────────────────

interface ContentPromptParams {
  readonly blockName: string;
  readonly blockDescription: string;
  readonly locale: string;
  readonly brandName: string;
  readonly brandDescription: string;
  readonly brandTone: string;
  readonly industry: string;
  readonly slotDescriptions: string;
}

function buildContentPrompt(params: ContentPromptParams): string {
  return `Generate content for the "${params.blockName}" block.

Block: ${params.blockDescription}
Brand: ${params.brandName} — ${params.brandDescription}
Tone: ${params.brandTone}
Industry: ${params.industry}
Language/Locale: ${params.locale}

Generate culturally appropriate content in the "${params.locale}" locale for these content slots:
${params.slotDescriptions}

Return a JSON object with a key for each slot name and the generated content as its value.
Content must be in the "${params.locale}" language and appropriate for the brand and industry.`;
}
