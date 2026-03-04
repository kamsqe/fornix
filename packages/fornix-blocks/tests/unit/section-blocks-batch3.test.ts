import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

/**
 * Shared test suite for Phase 41 blocks.
 * Tests: manifest parsing, zero hardcoded text, content collection usage,
 * CSS custom properties, responsiveness, companion conflicts, and Astro Actions.
 */

const PHASE_41_BLOCKS = [
  "cta-newsletter",
  "contact-form",
  "header-sticky",
  "header-transparent",
] as const;

const FORBIDDEN_TEXT_PATTERNS = [
  />\s*Welcome\b/i,
  />\s*Hello\b/i,
  />\s*Click here\b/i,
  />\s*Learn more\b/i,
  />\s*Sign up\b/i,
  />\s*Lorem ipsum/i,
  />\s*Stay in the Loop/i,
  />\s*Get in Touch/i,
  />\s*Subscribe\b/i,
  />\s*Send Message/i,
  />\s*Get Started\b/i,
  />\s*Hire Us\b/i,
  />\s*Your name\b/i,
  />\s*Your email\b/i,
  />\s*No spam\b/i,
];

for (const blockName of PHASE_41_BLOCKS) {
  describe(`${blockName} block`, () => {
    const blockDir = join(BLOCKS_DIR, blockName);

    describe("block.json", () => {
      it("parses against BlockManifestSchema", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        const result = BlockManifestSchema.safeParse(parsed);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(blockName);
          expect(result.data.type).toBe("section");
        }
      });

      it("has correct schemaVersion", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.schemaVersion).toBe(1);
      });

      it("has AI metadata with content slots", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);

        expect(parsed.ai).toBeDefined();
        expect(parsed.ai.whenToUse).toBeTruthy();
        expect(parsed.ai.whenNotToUse).toBeTruthy();
        expect(parsed.ai.pairsWith.length).toBeGreaterThan(0);
        expect(Object.keys(parsed.ai.contentSlots).length).toBeGreaterThan(0);
      });

      it("has files array with correct destinations", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);

        expect(parsed.files.length).toBeGreaterThanOrEqual(2);
        expect(parsed.files[0].destination).toContain(`${blockName}.astro`);
        expect(parsed.files[1].destination).toContain(`${blockName}.css`);
      });
    });

    describe(`${blockName}.astro`, () => {
      it("contains no hardcoded text strings", () => {
        const astroContent = readFileSync(
          join(blockDir, `${blockName}.astro`),
          "utf-8",
        );

        const parts = astroContent.split("---");
        const template = parts[2] ?? "";

        for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
          expect(
            pattern.test(template),
            `Found hardcoded text matching: ${pattern}`,
          ).toBe(false);
        }

        const textBetweenTags = template.match(/>([^<{]+)</g) ?? [];
        const hardcodedText = textBetweenTags
          .map((m) => m.replace(/^>/, "").replace(/<$/, "").trim())
          .filter((t) => /[a-zA-Z]{3,}/.test(t))
          .filter((t) => !t.startsWith("@import"))
          .filter((t) => !t.startsWith("/*"))
          .filter((t) => !t.startsWith("."))
          .filter((t) => !t.includes(".map("))
          .filter((t) => !t.includes("=>"))
          .filter((t) => !t.includes("const "))
          .filter((t) => !t.includes("function"));
        expect(hardcodedText, "Found bare text between HTML tags").toEqual([]);
      });

      it("reads content from content collection", () => {
        const astroContent = readFileSync(
          join(blockDir, `${blockName}.astro`),
          "utf-8",
        );
        expect(astroContent).toContain("getEntry");
        expect(astroContent).toContain("sections");
        expect(astroContent).toContain(blockName);
      });
    });

    describe("default-content.json", () => {
      it("parses as valid JSON with content", () => {
        const raw = readFileSync(
          join(blockDir, "default-content.json"),
          "utf-8",
        );
        const parsed = JSON.parse(raw);

        expect(typeof parsed).toBe("object");
        expect(parsed).not.toBeNull();
        expect(Object.keys(parsed).length).toBeGreaterThan(0);
      });
    });

    describe(`${blockName}.css`, () => {
      it("uses CSS custom properties for colors", () => {
        const css = readFileSync(
          join(blockDir, `${blockName}.css`),
          "utf-8",
        );
        expect(css).toContain("var(--color-");
      });

      it("is responsive", () => {
        const css = readFileSync(
          join(blockDir, `${blockName}.css`),
          "utf-8",
        );
        expect(css).toContain("@media");
      });
    });
  });
}

// Additional Phase 41 specific tests

describe("header-sticky and header-transparent conflict", () => {
  it("header-sticky conflicts with header-transparent", () => {
    const raw = readFileSync(join(BLOCKS_DIR, "header-sticky/block.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.conflicts).toContain("header-transparent");
  });

  it("header-transparent conflicts with header-sticky", () => {
    const raw = readFileSync(join(BLOCKS_DIR, "header-transparent/block.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.conflicts).toContain("header-sticky");
  });
});

describe("contact-form Astro Actions", () => {
  it("has contact-action.ts file", () => {
    const actionPath = join(BLOCKS_DIR, "contact-form/contact-action.ts");
    expect(existsSync(actionPath)).toBe(true);
  });

  it("block.json includes action file in files array", () => {
    const raw = readFileSync(join(BLOCKS_DIR, "contact-form/block.json"), "utf-8");
    const parsed = JSON.parse(raw);

    const actionFile = parsed.files.find(
      (f: { source: string }) => f.source === "contact-action.ts",
    );
    expect(actionFile).toBeDefined();
    expect(actionFile.destination).toBe("src/actions/contact-action.ts");
    expect(actionFile.condition).toBeTruthy();
  });

  it("requires hybrid or server rendering mode", () => {
    const raw = readFileSync(join(BLOCKS_DIR, "contact-form/block.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.requiredMode).toBe("server");
  });

  it("form uses data-astro-action attribute", () => {
    const astroContent = readFileSync(
      join(BLOCKS_DIR, "contact-form/contact-form.astro"),
      "utf-8",
    );
    expect(astroContent).toContain("data-astro-action");
  });

  it("contact-action.ts uses defineAction with Zod schema", () => {
    const actionContent = readFileSync(
      join(BLOCKS_DIR, "contact-form/contact-action.ts"),
      "utf-8",
    );
    expect(actionContent).toContain("defineAction");
    expect(actionContent).toContain("z.object");
    expect(actionContent).toContain("z.string()");
    expect(actionContent).toContain("z.string().email()");
  });
});
