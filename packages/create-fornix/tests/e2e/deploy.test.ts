/**
 * Deploy-target e2e — verifies the scaffold output is deploy-ready.
 *
 * We don't actually invoke `wrangler` in the test (that needs CF auth and
 * network) — we verify the wrangler.json file shape so a developer running
 * `npx wrangler pages deploy dist` against the scaffolded project succeeds.
 */
import { describe, it, expect } from "vitest";
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  scaffoldProject,
  type ResolvedConfig,
} from "../../src/index.js";

function makeConfig(
  projectDir: string,
  deployTarget: ResolvedConfig["deployTarget"],
): ResolvedConfig {
  return {
    projectName: "deploy-test",
    projectDir,
    renderMode: "static",
    deployTarget,
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: [
      { name: "hero-text", variant: "default" },
      { name: "footer-columns", variant: "default" },
    ],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      preset: "obsidian",
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    },
    themeSwitcher: false,
    createdWith: "manual",
  };
}

describe("v2 deploy target", () => {
  it("emits wrangler.json when deployTarget=cloudflare", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-deploy-cf-"));
    const projectDir = join(tmp, "site");
    try {
      const result = await scaffoldProject(makeConfig(projectDir, "cloudflare"));
      expect(result.ok).toBe(true);

      const wranglerPath = join(projectDir, "wrangler.json");
      expect(existsSync(wranglerPath), "wrangler.json missing").toBe(true);

      const wrangler = JSON.parse(readFileSync(wranglerPath, "utf8"));
      expect(wrangler.name).toBe("deploy-test");
      expect(wrangler.pages_build_output_dir).toBe("./dist");
      expect(wrangler.compatibility_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("does NOT emit wrangler.json when deployTarget=static", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-deploy-static-"));
    const projectDir = join(tmp, "site");
    try {
      const result = await scaffoldProject(makeConfig(projectDir, "static"));
      expect(result.ok).toBe(true);

      expect(existsSync(join(projectDir, "wrangler.json"))).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
