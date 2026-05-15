import { describe, it, expect } from "vitest";
import { RECIPES } from "../../src/cli/recipes";

describe("recipes", () => {
  it("provides predefined recipes", () => {
    expect(RECIPES["saas"]).toBeDefined();
    expect(RECIPES["agency"]).toBeDefined();
    expect(RECIPES["docs"]).toBeDefined();
    expect(RECIPES["blog"]).toBeDefined();
    expect(RECIPES["portfolio"]).toBeDefined();
  });
});
