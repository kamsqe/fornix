/**
 * Pre-flight cost + latency estimator for the AI scaffold path.
 *
 * Cheap to compute (pure arithmetic) — runs before any API call so the
 * user sees roughly what the upcoming scaffold will cost and how long
 * it will take before they commit to it. Not exact: rates and token
 * sizes are rules of thumb tuned on typical Fornix scaffolds.
 *
 * The estimator never throws; it returns 0/0 for unknown models so the
 * CLI can still print "AI copy enabled" without a divide-by-zero risk.
 */

export interface CostEstimateInput {
  /** Number of (block × locale) calls the copy generator will fan out. */
  copyCalls: number;
  /** Whether the prompt → archetype matcher will also fire (one extra call). */
  includesMatcher: boolean;
  /** Anthropic model ID (e.g. "claude-sonnet-4-6"). */
  model: string;
}

export interface CostEstimate {
  /** Estimated USD cost, rounded to four decimal places. */
  usd: number;
  /** Estimated wall-clock seconds (very rough — depends on parallelism). */
  seconds: number;
  /** Number of API calls total (matcher + copy). */
  calls: number;
}

// Per-million-token rates (USD). Approximate; revise when providers post
// new rate cards. The cost preview is a guidance number, not an invoice.
const RATES: Record<string, { inputPerM: number; outputPerM: number }> = {
  // Anthropic — Claude 4 series
  "claude-sonnet-4-6": { inputPerM: 3, outputPerM: 15 },
  "claude-opus-4-7": { inputPerM: 15, outputPerM: 75 },
  "claude-haiku-4-5-20251001": { inputPerM: 0.8, outputPerM: 4 },
  "claude-sonnet": { inputPerM: 3, outputPerM: 15 },
  "claude-opus": { inputPerM: 15, outputPerM: 75 },
  "claude-haiku": { inputPerM: 0.8, outputPerM: 4 },

  // Google — Gemini 3 series. Pricing per Google's published rate cards
  // (May 2026). Flash sits at Pro-level reasoning for ~1/8 the cost.
  "gemini-3-flash-preview": { inputPerM: 0.3, outputPerM: 2.5 },
  "gemini-3.1-flash-lite": { inputPerM: 0.1, outputPerM: 0.4 },
  "gemini-3.1-pro-preview": { inputPerM: 2, outputPerM: 12 },
  "gemini-3-flash": { inputPerM: 0.3, outputPerM: 2.5 },
  "gemini-3.1-pro": { inputPerM: 2, outputPerM: 12 },
};

// Per-call token estimates. Tuned by inspecting prompt + typical output
// sizes for a Fornix scaffold (hero, features, pricing, etc.).
const TOKENS_PER_COPY_CALL = { input: 350, output: 320 };
const TOKENS_PER_MATCHER_CALL = { input: 220, output: 280 };

// Effective parallelism per Anthropic API tier (rough — assumes default
// concurrency). All blocks fan out via Promise.all, but the server-side
// rate-limit + queueing means wall-clock is closer to N/PARALLELISM × per-call.
const PARALLELISM = 4;
const SECONDS_PER_CALL = 4;

export function estimateCost(input: CostEstimateInput): CostEstimate {
  const rate = RATES[input.model];
  if (!rate) {
    return { usd: 0, seconds: 0, calls: input.copyCalls + (input.includesMatcher ? 1 : 0) };
  }

  const copyCost =
    input.copyCalls *
    ((TOKENS_PER_COPY_CALL.input * rate.inputPerM +
      TOKENS_PER_COPY_CALL.output * rate.outputPerM) /
      1_000_000);
  const matcherCost = input.includesMatcher
    ? (TOKENS_PER_MATCHER_CALL.input * rate.inputPerM +
        TOKENS_PER_MATCHER_CALL.output * rate.outputPerM) /
      1_000_000
    : 0;

  const totalCalls = input.copyCalls + (input.includesMatcher ? 1 : 0);
  const seconds = Math.max(
    SECONDS_PER_CALL,
    Math.ceil((totalCalls / PARALLELISM) * SECONDS_PER_CALL),
  );

  return {
    usd: round(copyCost + matcherCost, 4),
    seconds,
    calls: totalCalls,
  };
}

/**
 * Format the estimate into a single CLI-friendly line:
 *   "~$0.05 · ~24s · 9 calls (Sonnet 4.6)"
 */
export function formatEstimate(
  estimate: CostEstimate,
  model: string,
): string {
  const usd = estimate.usd === 0 ? "—" : `~$${estimate.usd.toFixed(4)}`;
  const secs = estimate.seconds === 0 ? "—" : `~${estimate.seconds}s`;
  return `${usd} · ${secs} · ${estimate.calls} call${estimate.calls === 1 ? "" : "s"} (${friendlyModelName(model)})`;
}

function friendlyModelName(model: string): string {
  if (model.includes("gemini-3.1-pro")) return "Gemini 3.1 Pro";
  if (model.includes("gemini-3.1-flash-lite")) return "Gemini 3.1 Flash-Lite";
  if (model.includes("gemini-3.1-flash")) return "Gemini 3.1 Flash";
  if (model.includes("gemini-3-flash")) return "Gemini 3 Flash";
  if (model.includes("gemini")) return "Gemini";
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
