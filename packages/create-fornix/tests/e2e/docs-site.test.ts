import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { mkdtempSync, rmSync, existsSync, mkdirSync} from "node:fs";
import { tmpdir } from "node:os";

const CLI_PATH = join(__dirname, "../../dist/index.js");

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "fornix-docs-e2e-"));
}

describe("documentation site (phase 53)", () => {

  it("scaffolds a docs site with --recipe docs", () => {
    const dir = createTempDir();
    const projectDir = join(dir, "docs");
    mkdirSync(projectDir, { recursive: true });

    const result = execSync(
      `node ${CLI_PATH} create "${projectDir}" --recipe docs --yes --no-install --no-git`,
      { encoding: "utf-8", timeout: 15000, stdio: "pipe", env: { ...process.env, FORNIX_E2E_MOCK: "true" } },
    );

    // Verify key files exist
    expect(existsSync(join(projectDir, "fornix.json"))).toBe(true);
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "astro.config.mjs"))).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });

  it("all 6 required doc pages exist in docs/src/content/docs/", () => {
    const docsDir = join(__dirname, "../../../../docs");

    const requiredPages = [
      "quickstart.md",
      "blocks-reference.md",
      "ai-mode-guide.md",
      "mcp-setup.md",
      "i18n-guide.md",
      "palette-system.md",
    ];

    for (const page of requiredPages) {
      const pagePath = join(docsDir, "src/content/docs", page);
      expect(existsSync(pagePath), `Missing doc page: ${page}`).toBe(true);
    }
  });
});
