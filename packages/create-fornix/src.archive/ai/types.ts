import type { Intent, RecommendedBlock, Uncertainty } from "./schemas.js";

// ── Analysis Result ───────────────────────────────────────

export interface AnalysisResult {
  readonly intent: Intent;
  readonly followUpQuestions: ReadonlyArray<Question>;
  readonly highConfidenceBlocks: ReadonlyArray<RecommendedBlock>;
  readonly lowConfidenceBlocks: ReadonlyArray<RecommendedBlock>;
  readonly uncertainties: ReadonlyArray<Uncertainty>;
}

// ── Conversation Types ────────────────────────────────────

export interface Question {
  readonly id: string;
  readonly topic: string;
  readonly question: string;
  readonly options?: ReadonlyArray<string>;
  readonly defaultAnswer?: string;
}

export interface Answer {
  readonly questionId: string;
  readonly value: string;
}

// ── Config Proposal ───────────────────────────────────────

export interface ProposedConfig {
  readonly renderMode: "static" | "hybrid" | "server";
  readonly deployTarget: "cloudflare" | "vercel" | "netlify" | "static";
  readonly database: "none" | "d1" | "turso" | "astro-db" | "postgres";
  readonly cssEngine: "tailwind" | "vanilla";
  readonly blocks: ReadonlyArray<{ name: string; variant: string }>;
  readonly locales: ReadonlyArray<string>;
  readonly defaultLocale: string;
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
  readonly themeSwitcher: boolean;
}

// ── Brand Context (for palette generation) ────────────────

export interface BrandContext {
  readonly name: string;
  readonly industry: string;
  readonly tone: string;
  readonly prefersDarkMode: boolean;
  readonly visualStyle: string;
}

// ── Content Map ───────────────────────────────────────────

export interface ContentMap {
  readonly [blockName: string]: {
    readonly [locale: string]: Record<string, unknown>;
  };
}
