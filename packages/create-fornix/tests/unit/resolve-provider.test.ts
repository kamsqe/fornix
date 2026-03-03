import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveProvider } from "../../src/ai/resolve-provider.js";

// Mock isOllamaRunning to control detection
vi.mock("../../src/ai/providers/ollama-provider.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/ai/providers/ollama-provider.js")>(
    "../../src/ai/providers/ollama-provider.js",
  );
  return {
    ...actual,
    isOllamaRunning: vi.fn().mockResolvedValue(false),
  };
});

const { isOllamaRunning } = await import(
  "../../src/ai/providers/ollama-provider.js"
);

const mockedIsOllamaRunning = isOllamaRunning as ReturnType<typeof vi.fn>;

// ── Tests ────────────────────────────────────────────────

describe("resolveProvider", () => {
  beforeEach(() => {
    mockedIsOllamaRunning.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no keys and no Ollama", async () => {
    const provider = await resolveProvider({
      skipOllamaDetect: true,
      env: {},
    });

    expect(provider).toBeNull();
  });

  it("prefers Ollama when running", async () => {
    mockedIsOllamaRunning.mockResolvedValue(true);

    const provider = await resolveProvider({
      env: { OPENAI_API_KEY: "sk-test-key" },
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("ollama");
  });

  it("returns OpenAI provider when explicitly requested", async () => {
    const provider = await resolveProvider({
      provider: "openai",
      skipOllamaDetect: true,
      env: { OPENAI_API_KEY: "sk-test-key" },
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("openai");
  });

  it("returns mock provider when explicitly requested", async () => {
    const provider = await resolveProvider({
      provider: "mock",
      skipOllamaDetect: true,
      env: {},
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("mock");
  });

  it("returns Ollama provider when explicitly requested", async () => {
    const provider = await resolveProvider({
      provider: "ollama",
      skipOllamaDetect: true,
      env: {},
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("ollama");
  });

  it("returns Cloudflare provider when explicitly requested", async () => {
    const provider = await resolveProvider({
      provider: "cloudflare",
      skipOllamaDetect: true,
      env: {
        CLOUDFLARE_ACCOUNT_ID: "test-id",
        CLOUDFLARE_API_TOKEN: "test-token",
      },
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("cloudflare");
  });

  it("falls back to OpenAI via env when Ollama is not running", async () => {
    mockedIsOllamaRunning.mockResolvedValue(false);

    const provider = await resolveProvider({
      env: { OPENAI_API_KEY: "sk-test-key" },
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("openai");
  });

  it("falls back to Cloudflare via env when no OpenAI key", async () => {
    const provider = await resolveProvider({
      skipOllamaDetect: true,
      env: {
        CLOUDFLARE_ACCOUNT_ID: "test-id",
        CLOUDFLARE_API_TOKEN: "test-token",
      },
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("cloudflare");
  });

  it("explicit provider takes precedence over env vars", async () => {
    const provider = await resolveProvider({
      provider: "mock",
      skipOllamaDetect: true,
      env: { OPENAI_API_KEY: "sk-test-key" },
    });

    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("mock");
  });
});
