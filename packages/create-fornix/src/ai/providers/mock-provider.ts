/**
 * Mock AI Provider
 *
 * A test-only AI provider that matches prompt keywords to fixture responses.
 * Used for testing the AI flow without real API calls.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { IntentSchema, type Intent } from "../rules.js";
import { ok, err, type Result } from "../../utils/result.js";

// ── Types ────────────────────────────────────────────────

export interface AIProvider {
  readonly name: string;
  generate(prompt: string): Promise<Result<Intent, ProviderError>>;
}

export interface ProviderError {
  readonly kind: "ProviderError";
  readonly message: string;
  readonly prompt: string;
}

// ── Fixture Map ──────────────────────────────────────────

interface FixtureEntry {
  readonly keywords: ReadonlyArray<string>;
  readonly filename: string;
}

const FIXTURE_ENTRIES: ReadonlyArray<FixtureEntry> = [
  {
    keywords: ["fintech", "finance", "banking", "financial"],
    filename: "fintech-landing.json",
  },
  {
    keywords: ["blog", "personal", "travel", "lifestyle", "writing"],
    filename: "personal-blog.json",
  },
  {
    keywords: ["saas", "dashboard", "project management", "productivity", "taskflow"],
    filename: "saas-dashboard.json",
  },
  {
    keywords: ["agency", "multilingual", "design agency", "boutique", "international"],
    filename: "multilingual-agency.json",
  },
  {
    keywords: ["portfolio", "freelance", "developer", "personal site"],
    filename: "portfolio.json",
  },
];

// ── Mock Provider ────────────────────────────────────────

export function createMockProvider(): AIProvider {
  return {
    name: "mock",
    async generate(prompt: string): Promise<Result<Intent, ProviderError>> {
      const lowerPrompt = prompt.toLowerCase();

      const match = FIXTURE_ENTRIES.find((entry) =>
        entry.keywords.some((kw) => lowerPrompt.includes(kw)),
      );

      if (!match) {
        return err({
          kind: "ProviderError",
          message: `No fixture matched for prompt. Keywords tried: ${FIXTURE_ENTRIES.flatMap((e) => e.keywords).join(", ")}`,
          prompt,
        });
      }

      const fixtureDir = resolveFixtureDir();
      const filePath = join(fixtureDir, match.filename);

      try {
        const raw = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw) as unknown;
        const validated = IntentSchema.parse(parsed);
        return ok(validated);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown parse error";
        return err({
          kind: "ProviderError",
          message: `Failed to load fixture '${match.filename}': ${message}`,
          prompt,
        });
      }
    },
  };
}

// ── Helpers ──────────────────────────────────────────────

function resolveFixtureDir(): string {
  // In tests, __dirname-based resolution
  const thisDir = dirname(fileURLToPath(import.meta.url));
  // Walk from src/ai/providers/ → tests/fixtures/ai-responses/
  return join(thisDir, "..", "..", "..", "tests", "fixtures", "ai-responses");
}

/**
 * Load a specific fixture file by name (without .json extension).
 */
export function loadFixture(name: string): Intent {
  const fixtureDir = resolveFixtureDir();
  const filePath = join(fixtureDir, `${name}.json`);
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  return IntentSchema.parse(parsed);
}

/**
 * List all available fixture names.
 */
export function listFixtureNames(): ReadonlyArray<string> {
  return FIXTURE_ENTRIES.map((e) =>
    e.filename.replace(".json", ""),
  );
}
