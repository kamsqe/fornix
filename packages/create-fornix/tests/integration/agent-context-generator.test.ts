import { describe, it, expect } from "vitest";
import { generateAgentContext } from "../../src/scaffold/agent-context-generator";
import type { ResolvedConfig } from "../../src/schemas/config";
import type { BlockManifest } from "fornix-registry";

function manifest(name: string): BlockManifest {
  return {
    schemaVersion: 1,
    name,
    version: "1.0.0",
    type: "section",
    description: `Block ${name}`,
    category: "test",
    tags: [],
    dependencies: {},
    requires: [],
    conflicts: [],
    envVars: [],
    variants: ["default"],
    slots: [],
    files: [],
  };
}

function baseConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectName: "test-project",
    projectDir: "./test-project",
    renderMode: "static",
    deployTarget: "cloudflare",
    database: "none",
    cssEngine: "tailwind",
    packageManager: "pnpm",
    blocks: [
      { name: "hero-gradient", variant: "default" },
      { name: "footer-minimal", variant: "default" },
    ],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    },
    themeSwitcher: false,
    createdWith: "ai",
    ...overrides,
  } as ResolvedConfig;
}

describe("generateAgentContext", () => {
  it("includes actual block names from config in CLAUDE.md", () => {
    const config = baseConfig();
    const blocks = [manifest("hero-gradient"), manifest("footer-minimal")];
    
    const contextFiles = generateAgentContext(config, blocks);
    
    expect(contextFiles["CLAUDE.md"]).toBeDefined();
    const claudeContent = contextFiles["CLAUDE.md"];
    expect(claudeContent).toContain("hero-gradient");
    expect(claudeContent).toContain("footer-minimal");
  });

  it("includes locale info in CLAUDE.md when i18n enabled", () => {
    const config = baseConfig({ locales: ["en", "es"], defaultLocale: "en" });
    const blocks = [manifest("hero-gradient")];
    
    const contextFiles = generateAgentContext(config, blocks);
    
    expect(contextFiles["CLAUDE.md"]).toBeDefined();
    const claudeContent = contextFiles["CLAUDE.md"];
    expect(claudeContent).toContain("src/content/en/");
    expect(claudeContent).toContain("src/content/es/");
    expect(claudeContent).toContain("i18n is enabled");
  });

  it("creates the .cursor/rules directory with fornix.mdc", () => {
    const config = baseConfig();
    const blocks = [manifest("hero-gradient")];
    
    const contextFiles = generateAgentContext(config, blocks);
    
    expect(contextFiles[".cursor/rules/fornix.mdc"]).toBeDefined();
    const cursorRule = contextFiles[".cursor/rules/fornix.mdc"];
    expect(cursorRule).toContain("---"); // frontmatter
    expect(cursorRule).toContain("description:");
  });
  
  it("documents project architecture and commands", () => {
    const config = baseConfig({ renderMode: "server", deployTarget: "cloudflare" });
    const blocks: BlockManifest[] = [];
    
    const contextFiles = generateAgentContext(config, blocks);
    const claudeContent = contextFiles["CLAUDE.md"];
    
    expect(claudeContent).toContain("server");
    expect(claudeContent).toContain("cloudflare");
    // Commands should be mentioned
    expect(claudeContent).toContain("fornix add");
    expect(claudeContent).toContain("fornix mcp serve");
  });
});
