/**
 * AI Conversation Loop
 *
 * The full AI pipeline: analyze → clarify → resolve → content → palette.
 *
 * Flow:
 * 1. Analysis Phase — AI analyzes user description + full registry → Intent
 * 2. Clarification Phase — If confidence < 0.8 or uncertainties exist,
 *    ask max 3 follow-up questions via @clack/prompts
 * 3. Resolution Phase — Intent → rules engine → ProposedConfig
 * 4. Content Generation Phase — Generate content for selected blocks
 * 5. Palette Selection — Pick from pre-built palettes or use AI-generated
 * 6. Final Assembly — ProposedConfig → validate → ResolvedConfig
 */

import type { AIProvider } from "./provider.js";
import type { BlockRegistry } from "./prompt-builder.js";
import { buildSystemPrompt } from "./prompt-builder.js";
import { IntentSchema, type Intent } from "./schemas.js";
import type { ProposedConfig, ContentMap, Question, Answer } from "./types.js";
import { applyRules, createDefaultConfig, type MutableConfig } from "./rules.js";
import { ResolvedConfigSchema, type ResolvedConfig } from "../schemas/config.js";
import type { Palette } from "fornix-registry";
import { ok, err, type Result } from "../utils/result.js";
import type { ProviderError } from "../errors.js";

// ── Constants ────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.8;
const MAX_CLARIFICATION_ROUNDS = 3;
const BLOCK_CONFIDENCE_THRESHOLD = 0.7;

// ── Conversation Error ───────────────────────────────────

export interface ConversationError {
  readonly kind: "ProviderError" | "ValidationError";
  readonly message: string;
  readonly provider: string;
}

// ── Options ──────────────────────────────────────────────

export interface ConversationOptions {
  readonly provider: AIProvider;
  readonly registry: BlockRegistry;
  readonly description: string;
  readonly projectName: string;
  readonly projectDir: string;
  /** Optional callback for asking follow-up questions. Omit for non-interactive mode. */
  readonly askQuestion?: (question: Question) => Promise<Answer>;
}

// ── Public API ───────────────────────────────────────────

/**
 * Run the full AI conversation loop.
 *
 * Analyzes the user description, optionally clarifies ambiguities,
 * applies the rules engine, generates content, and produces a
 * validated ResolvedConfig.
 */
export async function runAIConversation(
  options: ConversationOptions,
): Promise<Result<ResolvedConfig, ConversationError>> {
  const { provider, registry, description, projectName, projectDir } = options;

  // ── Step 1: Analysis ─────────────────────────────────
  const intentResult = await analyzeDescription(provider, registry, description);
  if (!intentResult.ok) {
    return intentResult;
  }
  let intent = intentResult.value;

  // ── Step 2: Clarification ────────────────────────────
  if (options.askQuestion && needsClarification(intent)) {
    const clarifiedIntent = await runClarificationLoop(
      provider,
      registry,
      intent,
      description,
      options.askQuestion,
    );
    if (!clarifiedIntent.ok) {
      return clarifiedIntent;
    }
    intent = clarifiedIntent.value;
  }

  // ── Step 3: Resolution (rules engine) ────────────────
  const mutableConfig = intentToMutableConfig(intent);
  applyRules(intent, mutableConfig);

  // ── Step 4: Filter rules-added blocks to registry ────
  filterBlocksToRegistry(mutableConfig, registry);

  // ── Step 5: Add AI-recommended blocks ────────────────
  addRecommendedBlocks(intent, mutableConfig, registry);

  // ── Step 6: Palette selection ────────────────────────
  const palette = selectPalette(intent, registry);

  // ── Step 7: Content generation ───────────────────────
  const content = generateContent(intent, mutableConfig, registry);

  // ── Step 8: Assemble ResolvedConfig ──────────────────
  return assembleConfig({
    projectName,
    projectDir,
    mutableConfig,
    palette,
    content,
    intent,
  });
}

// ── Step 1: Analysis ─────────────────────────────────────

async function analyzeDescription(
  provider: AIProvider,
  registry: BlockRegistry,
  description: string,
): Promise<Result<Intent, ConversationError>> {
  const systemPrompt = buildSystemPrompt(registry);

  try {
    const intent = await provider.generate({
      system: systemPrompt,
      prompt: buildAnalysisPrompt(description),
      schema: IntentSchema,
    });
    return ok(intent);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown provider error";
    return err({
      kind: "ProviderError",
      message: `Analysis failed: ${message}`,
      provider: provider.name,
    });
  }
}

function buildAnalysisPrompt(description: string): string {
  return [
    "Analyze the following website description and produce a structured IntentSchema.",
    "",
    "## User Description",
    description,
    "",
    "## Instructions",
    "- Extract the site type, industry, and brand information",
    "- Identify which features are needed (auth, payments, blog, etc.)",
    "- Detect any language requirements for i18n",
    "- Recommend appropriate blocks from the catalog",
    "- Note any uncertainties that need clarification",
    "- Set overallConfidence based on how well you understand the requirements",
  ].join("\n");
}

// ── Step 2: Clarification ────────────────────────────────

function needsClarification(intent: Intent): boolean {
  return (
    intent.overallConfidence < CONFIDENCE_THRESHOLD ||
    intent.uncertainties.length > 0
  );
}

function extractQuestions(intent: Intent): ReadonlyArray<Question> {
  return intent.uncertainties.map((uncertainty, index) => ({
    id: `uncertainty-${index}`,
    topic: uncertainty.topic,
    question: uncertainty.question,
    defaultAnswer: uncertainty.defaultAssumption,
  }));
}

async function runClarificationLoop(
  provider: AIProvider,
  registry: BlockRegistry,
  intent: Intent,
  originalDescription: string,
  askQuestion: (question: Question) => Promise<Answer>,
): Promise<Result<Intent, ConversationError>> {
  let currentIntent = intent;
  let round = 0;

  while (round < MAX_CLARIFICATION_ROUNDS && needsClarification(currentIntent)) {
    const questions = extractQuestions(currentIntent);
    if (questions.length === 0) break;

    const answers: Answer[] = [];
    for (const question of questions) {
      const answer = await askQuestion(question);
      answers.push(answer);
    }

    // Re-analyze with the additional context from answers
    const clarificationContext = buildClarificationPrompt(
      originalDescription,
      currentIntent,
      answers,
    );

    const reanalysisResult = await analyzeDescription(
      provider,
      registry,
      clarificationContext,
    );

    if (!reanalysisResult.ok) {
      return reanalysisResult;
    }

    currentIntent = reanalysisResult.value;
    round++;
  }

  return ok(currentIntent);
}

function buildClarificationPrompt(
  originalDescription: string,
  intent: Intent,
  answers: ReadonlyArray<Answer>,
): string {
  const answerLines = answers
    .map((answer) => `- ${answer.questionId}: ${answer.value}`)
    .join("\n");

  return [
    originalDescription,
    "",
    "## Additional Context from Follow-up Questions",
    answerLines,
    "",
    `## Previous Analysis`,
    `Site type: ${intent.siteType}, Industry: ${intent.industry}`,
    `Brand: ${intent.brand.name} — ${intent.brand.description}`,
    "",
    "Please refine the analysis with this additional information.",
    "Increase overallConfidence if the answers resolve previous uncertainties.",
  ].join("\n");
}

// ── Step 3: Intent → MutableConfig ───────────────────────

function intentToMutableConfig(intent: Intent): MutableConfig {
  return createDefaultConfig({
    locales: intent.languages.length > 0 ? [...intent.languages] : ["en"],
    defaultLocale: intent.languages.length > 0 ? intent.languages[0] : "en",
    themeSwitcher: intent.wantsThemeSwitcher,
  });
}

// ── Step 4: Filter to Registry ───────────────────────────

/**
 * Remove blocks added by the rules engine that don't exist in the registry.
 * The rules engine adds blocks like analytics-cf, payments-stripe, etc.
 * which may not be available in the current block registry.
 */
function filterBlocksToRegistry(
  config: MutableConfig,
  registry: BlockRegistry,
): void {
  const registryBlockNames = new Set(Object.values(registry.blocks).map((b) => b.name));
  config.blocks = config.blocks.filter((b) => registryBlockNames.has(b.name));
}

// ── Step 5: Recommended Blocks ───────────────────────────

function addRecommendedBlocks(
  intent: Intent,
  config: MutableConfig,
  registry: BlockRegistry,
): void {
  const registryBlockNames = new Set(Object.values(registry.blocks).map((b) => b.name));

  for (const recommendation of intent.recommendedBlocks) {
    if (
      recommendation.confidence >= BLOCK_CONFIDENCE_THRESHOLD &&
      registryBlockNames.has(recommendation.blockName) &&
      !config.blocks.some((b) => b.name === recommendation.blockName)
    ) {
      config.blocks.push({
        name: recommendation.blockName,
        variant: "default",
      });
    }
  }
}

// ── Step 5: Palette Selection ────────────────────────────

function selectPalette(
  intent: Intent,
  registry: BlockRegistry,
): { preset?: string; colors: { primary: string; secondary: string; accent: string; background: string; foreground: string } } {
  const palettes = registry.palettes;

  if (intent.palettePreference === "prebuilt" && palettes.length > 0) {
    const matched = findBestPalette(intent, palettes);
    return {
      preset: matched.name,
      colors: { ...matched.colors },
    };
  }

  if (intent.palettePreference === "ai-generated") {
    // For AI-generated palettes, generate colors based on brand context.
    // In the mock flow, we pick a palette that fits and mark it without preset.
    const matched = findBestPalette(intent, palettes);
    return {
      colors: { ...matched.colors },
    };
  }

  // Default: pick the best matching palette from registry
  if (palettes.length > 0) {
    const matched = findBestPalette(intent, palettes);
    return {
      preset: matched.name,
      colors: { ...matched.colors },
    };
  }

  // Absolute fallback
  return {
    colors: {
      primary: "#3b82f6",
      secondary: "#6366f1",
      accent: "#8b5cf6",
      background: "#ffffff",
      foreground: "#1a1a2e",
    },
  };
}

function findBestPalette(
  intent: Intent,
  palettes: ReadonlyArray<Palette>,
): Palette {
  // Prefer dark mode palettes when the intent prefers dark mode
  const modePreference = intent.prefersDarkMode ? "dark" : "light";

  const modeMatched = palettes.filter((p) => p.mode === modePreference);
  const candidates = modeMatched.length > 0 ? modeMatched : palettes;

  // Try to match by industry keywords in palette name or category
  const industryLower = intent.industry.toLowerCase();
  const industryMatched = candidates.find(
    (p) =>
      p.name.includes(industryLower) ||
      p.category.toLowerCase().includes(industryLower),
  );

  if (industryMatched) {
    return industryMatched;
  }

  // Return first candidate with mode preference
  return candidates[0] as Palette;
}

// ── Step 6: Content Generation ───────────────────────────

function generateContent(
  intent: Intent,
  config: MutableConfig,
  registry: BlockRegistry,
): Record<string, Record<string, unknown>> | undefined {
  const selectedBlockNames = new Set(config.blocks.map((b) => b.name));
  const blocksWithContent = Object.values(registry.blocks).filter(
    (b) =>
      selectedBlockNames.has(b.name) &&
      b.ai?.contentSlots &&
      Object.keys(b.ai.contentSlots).length > 0,
  );

  if (blocksWithContent.length === 0) {
    return undefined;
  }

  const content: Record<string, Record<string, unknown>> = {};
  const locales = config.locales;

  for (const block of blocksWithContent) {
    const slots = block.ai?.contentSlots;
    if (!slots) continue;

    const blockContent: Record<string, unknown> = {};

    for (const locale of locales) {
      const localeContent: Record<string, unknown> = {};

      for (const [slotName, slot] of Object.entries(slots)) {
        localeContent[slotName] = generateSlotContent(
          slotName,
          slot as { type: string; description?: string; maxLength?: number; example?: unknown },
          intent,
          locale,
        );
      }

      blockContent[locale] = localeContent;
    }

    content[block.name] = blockContent;
  }

  return Object.keys(content).length > 0 ? content : undefined;
}

function generateSlotContent(
  slotName: string,
  slot: { type: string; description?: string; maxLength?: number; example?: unknown },
  intent: Intent,
  locale: string,
): unknown {
  // Generate placeholder content based on slot type and brand context
  const brandName = intent.brand.name;
  const localeSuffix = locale !== "en" ? ` (${locale})` : "";

  switch (slot.type) {
    case "string": {
      if (slotName.includes("headline") || slotName.includes("heading") || slotName.includes("title")) {
        return `${brandName} — ${intent.brand.tagline ?? intent.brand.description}${localeSuffix}`;
      }
      if (slotName.includes("button") || slotName.includes("cta")) {
        return `Get Started${localeSuffix}`;
      }
      if (slotName.includes("copyright")) {
        return `© ${new Date().getFullYear()} ${brandName}. All rights reserved.${localeSuffix}`;
      }
      return `${slot.description ?? slotName}${localeSuffix}`;
    }
    case "array":
      return [];
    case "number":
      return 0;
    case "boolean":
      return false;
    case "object":
      return {};
    default:
      return slot.example ?? null;
  }
}

// ── Step 7: Assembly ─────────────────────────────────────

interface AssemblyInput {
  readonly projectName: string;
  readonly projectDir: string;
  readonly mutableConfig: MutableConfig;
  readonly palette: {
    readonly preset?: string;
    readonly colors: {
      readonly primary: string;
      readonly secondary: string;
      readonly accent: string;
      readonly background: string;
      readonly foreground: string;
    };
  };
  readonly content: Record<string, Record<string, unknown>> | undefined;
  readonly intent: Intent;
}

function assembleConfig(
  input: AssemblyInput,
): Result<ResolvedConfig, ConversationError> {
  const raw = {
    projectName: input.projectName,
    projectDir: input.projectDir,
    renderMode: input.mutableConfig.renderMode,
    deployTarget: input.mutableConfig.deployTarget,
    database: input.mutableConfig.database,
    cssEngine: "tailwind" as const,
    packageManager: "pnpm" as const,
    blocks: input.mutableConfig.blocks.map((b) => ({
      name: b.name,
      variant: b.variant,
    })),
    locales: input.mutableConfig.locales,
    defaultLocale: input.mutableConfig.defaultLocale,
    palette: {
      preset: input.palette.preset,
      colors: { ...input.palette.colors },
    },
    themeSwitcher: input.mutableConfig.themeSwitcher,
    content: input.content,
    createdWith: "ai" as const,
  };

  const parsed = ResolvedConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return err({
      kind: "ValidationError",
      message: `Config validation failed: ${parsed.error.message}`,
      provider: "conversation",
    });
  }

  return ok(parsed.data);
}
