/**
 * Cost estimator — pure-arithmetic unit tests.
 */
import { describe, it, expect } from "vitest";

import { estimateCost, formatEstimate } from "../../src/ai/cost-estimate.js";

describe("estimateCost", () => {
  it("returns 0/0 for an unknown model (no divide-by-zero, no surprises)", () => {
    const result = estimateCost({
      copyCalls: 8,
      includesMatcher: true,
      model: "claude-not-a-real-model",
    });
    expect(result.usd).toBe(0);
    expect(result.seconds).toBe(0);
    expect(result.calls).toBe(9); // still counts the calls
  });

  it("estimates a typical Sonnet saas scaffold (8 copy calls + matcher)", () => {
    const result = estimateCost({
      copyCalls: 8,
      includesMatcher: true,
      model: "claude-sonnet-4-6",
    });
    expect(result.calls).toBe(9);
    // 8 × (350 × 3 + 320 × 15) / 1M + 1 × (220 × 3 + 280 × 15) / 1M
    //   = 8 × 0.00585 + 0.00486
    //   = 0.0468 + 0.00486
    //   = 0.05166 → rounded to 0.0517
    expect(result.usd).toBeGreaterThan(0.04);
    expect(result.usd).toBeLessThan(0.07);
    // 9 calls / 4 parallelism × 4s per call = ~12s
    expect(result.seconds).toBeGreaterThanOrEqual(4);
    expect(result.seconds).toBeLessThan(60);
  });

  it("Opus is roughly 5× the cost of Sonnet for the same workload", () => {
    const sonnet = estimateCost({
      copyCalls: 10,
      includesMatcher: false,
      model: "claude-sonnet-4-6",
    });
    const opus = estimateCost({
      copyCalls: 10,
      includesMatcher: false,
      model: "claude-opus-4-7",
    });
    expect(opus.usd).toBeGreaterThan(sonnet.usd * 4);
    expect(opus.usd).toBeLessThan(sonnet.usd * 6);
  });

  it("Haiku is cheaper than Sonnet for the same workload", () => {
    const sonnet = estimateCost({
      copyCalls: 10,
      includesMatcher: false,
      model: "claude-sonnet-4-6",
    });
    const haiku = estimateCost({
      copyCalls: 10,
      includesMatcher: false,
      model: "claude-haiku-4-5-20251001",
    });
    expect(haiku.usd).toBeLessThan(sonnet.usd);
  });

  it("excluding the matcher reduces the call count by exactly 1", () => {
    const withMatcher = estimateCost({
      copyCalls: 8,
      includesMatcher: true,
      model: "claude-sonnet-4-6",
    });
    const without = estimateCost({
      copyCalls: 8,
      includesMatcher: false,
      model: "claude-sonnet-4-6",
    });
    expect(withMatcher.calls).toBe(without.calls + 1);
    expect(withMatcher.usd).toBeGreaterThan(without.usd);
  });
});

describe("formatEstimate", () => {
  it("renders a friendly one-liner with model family", () => {
    const formatted = formatEstimate(
      { usd: 0.0517, seconds: 24, calls: 9 },
      "claude-sonnet-4-6",
    );
    expect(formatted).toContain("$0.0517");
    expect(formatted).toContain("24s");
    expect(formatted).toContain("9 calls");
    expect(formatted).toContain("Sonnet");
  });

  it("singularizes the call label when calls=1", () => {
    const formatted = formatEstimate(
      { usd: 0.005, seconds: 4, calls: 1 },
      "claude-sonnet-4-6",
    );
    expect(formatted).toContain("1 call (");
    expect(formatted).not.toContain("1 calls");
  });

  it("renders em-dashes for unknown models (no fake numbers)", () => {
    const formatted = formatEstimate(
      { usd: 0, seconds: 0, calls: 9 },
      "claude-not-real",
    );
    expect(formatted).toContain("—");
    expect(formatted).toContain("9 calls");
  });
});
