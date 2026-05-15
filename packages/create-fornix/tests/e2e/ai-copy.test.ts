/**
 * AI copy e2e — proves the provider seam works.
 *
 * Uses `createMockProvider` (deterministic, no network) to feed structured
 * copy into `scaffoldProject`, then asserts the AI-generated text actually
 * lands in the rendered HTML — not just stored in memory.
 *
 * The real Anthropic provider (day 4b) is a drop-in replacement at the same
 * interface; if this test stays green, the real provider's only failure
 * modes are network/quota, never integration shape.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
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
  createMockProvider,
  type ResolvedConfig,
  type BrandContext,
} from "../../src/index.js";

const AI_HEADLINE = "Settle disputes in seconds, not weeks";
const AI_SUBHEADLINE =
  "Lexura uses verified evidence and AI to resolve commercial conflicts at a fraction of the cost.";
const AI_CTA = "Start a case";
const AI_FOOTER_COPYRIGHT = "© 2026 Lexura Legal Inc.";

function makeBaseConfig(projectDir: string): ResolvedConfig {
  return {
    projectName: "ai-test",
    projectDir,
    renderMode: "static",
    deployTarget: "static",
    database: "none",
    cssEngine: "vanilla",
    packageManager: "npm",
    blocks: [
      { name: "hero-gradient", variant: "default" },
      { name: "footer-minimal", variant: "default" },
    ],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      preset: "midnight",
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
  };
}

const brand: BrandContext = {
  name: "Lexura",
  description: "AI-powered commercial dispute resolution platform",
  tone: "professional, clear, trustworthy",
  industry: "legal-tech",
  audience: "small business owners and in-house counsel",
};

describe("v2 AI copy seam", () => {
  it("AI-generated content reaches the rendered HTML", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-ai-"));
    const projectDir = join(tmp, "site");

    try {
      const provider = createMockProvider({
        "hero-gradient": {
          headline: AI_HEADLINE,
          subheadline: AI_SUBHEADLINE,
          ctaText: AI_CTA,
          ctaHref: "#start",
          badge: "Beta",
        },
        "footer-minimal": {
          copyright: AI_FOOTER_COPYRIGHT,
          tagline: "Built for legal teams.",
          links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ],
        },
      });

      const result = await scaffoldProject(makeBaseConfig(projectDir), {
        provider,
        brand,
      });
      expect(result.ok, JSON.stringify(result, null, 2)).toBe(true);
      if (!result.ok) return;

      // Provenance trace shows both blocks were filled by AI.
      const aiEntries = result.value.copyTrace.filter((e) => e.source === "ai");
      expect(aiEntries.map((e) => e.blockName).sort()).toEqual([
        "footer-minimal",
        "hero-gradient",
      ]);

      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      const html = readFileSync(
        join(projectDir, "dist", "index.html"),
        "utf8",
      );

      // AI copy renders, not defaults.
      expect(html).toContain(AI_HEADLINE);
      expect(html).toContain(AI_SUBHEADLINE);
      expect(html).toContain(AI_CTA);
      expect(html).toContain(AI_FOOTER_COPYRIGHT);

      // Default copy is NOT present (proves the AI seam actually overrode).
      expect(html).not.toContain("Build Beautiful Websites Faster");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);

  it("falls back to default-content when the provider errors", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-ai-fb-"));
    const projectDir = join(tmp, "site");

    try {
      const provider = createMockProvider({
        "hero-gradient": new Error("simulated provider outage"),
        // footer-minimal has no entry → also produces an error → also falls back
      });

      const result = await scaffoldProject(makeBaseConfig(projectDir), {
        provider,
        brand,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Both blocks fell back to defaults.
      const trace = result.value.copyTrace;
      expect(trace.every((e) => e.source === "default")).toBe(true);

      execSync("npm install --no-audit --no-fund --loglevel=error", {
        cwd: projectDir,
        stdio: "pipe",
      });
      execSync("npx astro build", { cwd: projectDir, stdio: "pipe" });

      const html = readFileSync(
        join(projectDir, "dist", "index.html"),
        "utf8",
      );

      // Default hero headline appears (proves fallback path works).
      expect(html).toContain("Build Beautiful Websites Faster");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 240_000);

  it("validates provider output against the block's slot schema", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "fornix-ai-val-"));
    const projectDir = join(tmp, "site");

    try {
      const provider = createMockProvider({
        "hero-gradient": {
          // headline `maxLength` is 80 in the manifest; this is 200+ chars
          // and should fail validation, triggering fallback for this block.
          headline:
            "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip",
          subheadline: "ok",
          ctaText: "ok",
          ctaHref: "#",
        },
        "footer-minimal": {
          copyright: "© 2026 Test Co.",
          tagline: "Validated.",
          links: [],
        },
      });

      const result = await scaffoldProject(makeBaseConfig(projectDir), {
        provider,
        brand,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const heroEntry = result.value.copyTrace.find(
        (e) => e.blockName === "hero-gradient",
      );
      const footerEntry = result.value.copyTrace.find(
        (e) => e.blockName === "footer-minimal",
      );
      expect(heroEntry?.source).toBe("ai-validation-failed");
      expect(footerEntry?.source).toBe("ai");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 60_000);
});
