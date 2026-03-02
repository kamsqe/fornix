import { describe, it, expect } from "vitest";
import { ok, err, isOk, isErr, unwrap } from "../../src/utils/result";
import {
  SchemaValidationError,
  DependencyConflictError,
  CircularDependencyError,
  BlockNotFoundError,
  ProviderError,
} from "../../src/errors";

// ── Result Tests ──────────────────────────────────────────

describe("Result utilities", () => {
  it("ok(42) returns { ok: true, value: 42 }", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("err('fail') returns { ok: false, error: 'fail' }", () => {
    const result = err("fail");
    expect(result).toEqual({ ok: false, error: "fail" });
  });

  it("isOk returns true for ok result", () => {
    expect(isOk(ok(42))).toBe(true);
  });

  it("isOk returns false for err result", () => {
    expect(isOk(err("fail"))).toBe(false);
  });

  it("isErr returns true for err result", () => {
    expect(isErr(err("fail"))).toBe(true);
  });

  it("isErr returns false for ok result", () => {
    expect(isErr(ok(42))).toBe(false);
  });

  it("unwrap(ok(42)) returns 42", () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it("unwrap(err('fail')) throws", () => {
    expect(() => unwrap(err("fail"))).toThrow();
  });

  it("unwrap(err(...)) throws with the error message", () => {
    expect(() => unwrap(err("something broke"))).toThrow("something broke");
  });

  it("ok preserves complex values", () => {
    const data = { blocks: ["hero", "footer"], count: 2 };
    const result = ok(data);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual(data);
    }
  });

  it("err preserves complex error objects", () => {
    const error = { code: "NOT_FOUND", message: "Block missing" };
    const result = err(error);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual(error);
    }
  });
});

// ── Error Types Tests ─────────────────────────────────────

describe("Error types", () => {
  it("SchemaValidationError has correct structure", () => {
    const error: SchemaValidationError = {
      kind: "SchemaValidationError",
      message: "Invalid block manifest",
      path: ["name"],
    };
    expect(error.kind).toBe("SchemaValidationError");
  });

  it("DependencyConflictError has correct structure", () => {
    const error: DependencyConflictError = {
      kind: "DependencyConflictError",
      message: "hero-split conflicts with hero-gradient",
      blockA: "hero-split",
      blockB: "hero-gradient",
    };
    expect(error.kind).toBe("DependencyConflictError");
    expect(error.blockA).toBe("hero-split");
  });

  it("CircularDependencyError has correct structure", () => {
    const error: CircularDependencyError = {
      kind: "CircularDependencyError",
      message: "Circular dependency: a → b → a",
      chain: ["a", "b", "a"],
    };
    expect(error.kind).toBe("CircularDependencyError");
    expect(error.chain).toEqual(["a", "b", "a"]);
  });

  it("BlockNotFoundError has correct structure", () => {
    const error: BlockNotFoundError = {
      kind: "BlockNotFoundError",
      message: "Block 'super-hero' not found in registry",
      blockName: "super-hero",
    };
    expect(error.kind).toBe("BlockNotFoundError");
  });

  it("ProviderError has correct structure", () => {
    const error: ProviderError = {
      kind: "ProviderError",
      message: "OpenAI API key not set",
      provider: "openai",
    };
    expect(error.kind).toBe("ProviderError");
    expect(error.provider).toBe("openai");
  });

  it("error types can be used as Result error values", () => {
    const result = err<number, BlockNotFoundError>({
      kind: "BlockNotFoundError",
      message: "Not found",
      blockName: "missing-block",
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe("BlockNotFoundError");
    }
  });
});
