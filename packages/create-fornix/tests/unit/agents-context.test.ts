/**
 * AI-editor context emitter — unit tests.
 *
 * Asserts AGENTS.md / CLAUDE.md / .cursor/rules/fornix.mdc /
 * .fornix/project.json are emitted with project-specific content
 * (block names, page slugs, palette name, brand) — not boilerplate.
 */
import { describe, it, expect } from "vitest";

import { renderAiContextFiles } from "../../src/scaffold/agents-context.js";
import type { RenderPlan } from "../../src/scaffold/render-plan.js";

function makePlan(): RenderPlan {
  return {
    projectName: "helix-test",
    projectDir: "/tmp/helix",
    locale: "en",
    locales: ["en", "es"],
    palette: {
      name: "obsidian",
      mode: "dark",
      css: ":root { --color-primary: #fff; }",
    },
    deployTarget: "static",
    siteConfig: {
      name: "Helix",
      tagline: "Calendars that protect deep work.",
      archetype: "saas",
      locale: { default: "en", supported: ["en", "es"] },
    },
    layout: { title: "Helix", description: "..." },
    pages: [
      {
        slug: "",
        title: "Home",
        description: "Home page",
        sectionBlocks: [
          {
            manifest: {
              name: "hero-text",
              version: "2.0.0",
              category: "hero",
              description: "Text-first hero with eyebrow, headline, subhead, CTAs.",
              files: [],
              dependencies: {},
            },
            files: {},
            defaultContent: {},
          } as any,
          {
            manifest: {
              name: "footer-columns",
              version: "2.0.0",
              category: "footer",
              description: "Multi-column footer that reads site.config.",
              files: [],
              dependencies: {},
            },
            files: {},
            defaultContent: {},
          } as any,
        ],
      },
      {
        slug: "pricing",
        title: "Pricing — Helix",
        description: "Pricing page",
        sectionBlocks: [],
      },
    ],
    contentEntries: [],
    dependencies: {},
  };
}

describe("agents-context emitter", () => {
  const files = renderAiContextFiles(makePlan());

  it("emits all four AI-context files", () => {
    expect(Object.keys(files).sort()).toEqual([
      ".cursor/rules/fornix.mdc",
      ".fornix/project.json",
      "AGENTS.md",
      "CLAUDE.md",
    ]);
  });

  it("AGENTS.md and CLAUDE.md share the same body", () => {
    expect(files["AGENTS.md"]).toBe(files["CLAUDE.md"]);
  });

  it("body names the brand, archetype, palette, and locales", () => {
    const body = files["AGENTS.md"];
    expect(body).toContain("Helix");
    expect(body).toContain("Calendars that protect deep work");
    expect(body).toContain("`saas`");
    expect(body).toContain("`obsidian`");
    expect(body).toContain("dark mode");
    expect(body).toContain("`en`");
    expect(body).toContain("`es`");
  });

  it("body lists every block referenced by the plan, by name", () => {
    const body = files["AGENTS.md"];
    expect(body).toContain("`hero-text`");
    expect(body).toContain("`footer-columns`");
  });

  it("body lists routed pages by slug", () => {
    const body = files["AGENTS.md"];
    expect(body).toContain("`/`"); // home
    expect(body).toContain("`/pricing`");
  });

  it("body covers the palette tokens an agent can reference", () => {
    const body = files["AGENTS.md"];
    expect(body).toContain("--color-primary");
    expect(body).toContain("--font-headline");
    expect(body).toContain("--radius-md");
    expect(body).toContain("--shadow-sm");
    expect(body).toContain("--duration-fast");
  });

  it("body lists primitives by name", () => {
    const body = files["AGENTS.md"];
    for (const primitive of [
      "Container",
      "Section",
      "Headline",
      "Eyebrow",
      "Button",
      "Card",
      "Badge",
      "Icon",
    ]) {
      expect(body, `primitive ${primitive} missing`).toContain(primitive);
    }
  });

  it("body teaches conventions (BEM, no hardcoded colors)", () => {
    const body = files["AGENTS.md"];
    expect(body).toContain("BEM");
    expect(body).toMatch(/no hardcoded colors|never hardcoded|color-mix/i);
  });

  it("Cursor .mdc starts with valid frontmatter (description + globs + alwaysApply)", () => {
    const mdc = files[".cursor/rules/fornix.mdc"];
    expect(mdc.startsWith("---\n")).toBe(true);
    expect(mdc).toContain("description:");
    expect(mdc).toContain("globs:");
    expect(mdc).toContain("alwaysApply: true");
  });

  it(".fornix/project.json is valid JSON with the right shape", () => {
    const json = JSON.parse(files[".fornix/project.json"]);
    expect(json.schemaVersion).toBe(1);
    expect(json.brand).toBe("Helix");
    expect(json.archetype).toBe("saas");
    expect(json.palette).toBe("obsidian");
    expect(json.locales.default).toBe("en");
    expect(json.locales.supported).toEqual(["en", "es"]);
    expect(json.pages).toHaveLength(2);
    expect(json.pages[0]?.blocks).toEqual(["hero-text", "footer-columns"]);
    expect(json.blocks.map((b: { name: string }) => b.name)).toContain("hero-text");
  });
});
