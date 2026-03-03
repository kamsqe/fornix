import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

/**
 * Shared test suite for Phase 39 blocks.
 * Tests: manifest parsing, zero hardcoded text, content collection usage,
 * CSS custom properties, responsiveness, and no conflicts between blocks.
 */

const PHASE_39_BLOCKS = [
  "hero-split",
  "hero-video",
  "pricing-table",
  "cta-banner",
  "footer-rich",
] as const;

// Forbidden patterns for hardcoded text in templates
const FORBIDDEN_TEXT_PATTERNS = [
  />\s*Welcome\b/i,
  />\s*Get Started\b/i,
  />\s*Hello\b/i,
  />\s*Click here\b/i,
  />\s*Learn more\b/i,
  />\s*Sign up\b/i,
  />\s*Lorem ipsum/i,
  />\s*Subscribe\b/i,
  />\s*Contact us\b/i,
  />\s*Build Beautiful/i,
  />\s*Ready to\b/i,
  />\s*Join thousands\b/i,
  />\s*Simple, Transparent/i,
  />\s*Experience the/i,
  />\s*Ship Products/i,
];

for (const blockName of PHASE_39_BLOCKS) {
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

        expect(parsed.files.length).toBe(2);
        expect(parsed.files[0].destination).toContain(`${blockName}.astro`);
        expect(parsed.files[1].destination).toContain(`${blockName}.css`);
      });

      it("declares no conflicts with companion blocks", () => {
        const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
        const parsed = JSON.parse(raw);

        // None of the Phase 39 blocks should conflict with each other
        for (const otherBlock of PHASE_39_BLOCKS) {
          if (otherBlock !== blockName) {
            expect(parsed.conflicts).not.toContain(otherBlock);
          }
        }
      });
    });

    describe(`${blockName}.astro`, () => {
      it("contains no hardcoded text strings", () => {
        const astroContent = readFileSync(
          join(blockDir, `${blockName}.astro`),
          "utf-8",
        );

        // Extract template section (after the second ---)
        const parts = astroContent.split("---");
        const template = parts[2] ?? "";

        for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
          expect(
            pattern.test(template),
            `Found hardcoded text matching: ${pattern}`,
          ).toBe(false);
        }

        // Check for bare text between HTML tags
        const textBetweenTags = template.match(/>([^<{]+)</g) ?? [];
        const hardcodedText = textBetweenTags
          .map((m) => m.replace(/^>/, "").replace(/<$/, "").trim())
          .filter((t) => /[a-zA-Z]{3,}/.test(t))
          .filter((t) => !t.startsWith("@import"))
          .filter((t) => !t.startsWith("/*"))
          .filter((t) => !t.startsWith("."))
          .filter((t) => !t.includes(".map("))  // Astro template iteration
          .filter((t) => !t.includes("=>"))      // arrow functions in templates
          .filter((t) => !t.includes("const "))  // JS code
          .filter((t) => !t.includes("function")); // JS code
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
