import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

describe("hero-gradient block", () => {
  const blockDir = join(BLOCKS_DIR, "hero-gradient");

  describe("block.json", () => {
    it("parses against BlockManifestSchema", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);
      const result = BlockManifestSchema.safeParse(parsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("hero-gradient");
        expect(result.data.type).toBe("section");
        expect(result.data.category).toBe("hero");
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
      expect(parsed.ai.contentSlots.headline).toBeDefined();
      expect(parsed.ai.contentSlots.subheadline).toBeDefined();
      expect(parsed.ai.contentSlots.ctaText).toBeDefined();
    });

    it("has files array with correct destinations", () => {
      const raw = readFileSync(join(blockDir, "block.json"), "utf-8");
      const parsed = JSON.parse(raw);

      expect(parsed.files.length).toBe(2);
      expect(parsed.files[0].destination).toBe("src/components/sections/hero-gradient.astro");
      expect(parsed.files[1].destination).toBe("src/styles/sections/hero-gradient.css");
    });
  });

  describe("hero-gradient.astro", () => {
    it("contains no hardcoded text strings", () => {
      const astroContent = readFileSync(join(blockDir, "hero-gradient.astro"), "utf-8");

      // Extract template section (after the second ---)
      const parts = astroContent.split("---");
      const template = parts[2] ?? "";

      // The template should not contain any bare English text outside of expressions.
      // We check by looking for common user-facing strings that would indicate
      // hardcoded content. Class names, HTML tags, and variable refs are fine.
      const forbiddenPatterns = [
        />\s*Welcome\b/i,
        />\s*Get Started\b/i,
        />\s*Hello\b/i,
        />\s*Click here\b/i,
        />\s*Learn more\b/i,
        />\s*Sign up\b/i,
        />\s*Lorem ipsum/i,
        />\s*Build Beautiful/i,
        />\s*Subscribe\b/i,
        />\s*Contact\b/i,
      ];

      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(template), `Found hardcoded text matching: ${pattern}`).toBe(false);
      }

      // Also verify the template ONLY renders variables via {} expressions
      // Count text nodes: lines that contain >text< (text between closing/opening tags)
      // that is NOT an expression
      const textBetweenTags = template.match(/>([^<{]+)</g) ?? [];
      const hardcodedText = textBetweenTags
        .map((m) => m.replace(/^>/, "").replace(/<$/, "").trim())
        .filter((t) => /[a-zA-Z]{3,}/.test(t))
        .filter((t) => !t.startsWith("@import")) // CSS imports are code, not content
        .filter((t) => !t.startsWith("/*")) // CSS comments
        .filter((t) => !t.startsWith(".")); // CSS selectors
      expect(hardcodedText, "Found bare text between HTML tags").toEqual([]);
    });

    it("reads content from content collection", () => {
      const astroContent = readFileSync(join(blockDir, "hero-gradient.astro"), "utf-8");
      expect(astroContent).toContain("getEntry");
      expect(astroContent).toContain("sections");
      expect(astroContent).toContain("hero-gradient");
    });
  });

  describe("default-content.json", () => {
    it("has all required content fields", () => {
      const raw = readFileSync(join(blockDir, "default-content.json"), "utf-8");
      const parsed = JSON.parse(raw);

      expect(parsed.headline).toBeTruthy();
      expect(typeof parsed.headline).toBe("string");
      expect(typeof parsed.subheadline).toBe("string");
      expect(typeof parsed.ctaText).toBe("string");
      expect(typeof parsed.ctaHref).toBe("string");
    });
  });

  describe("hero-gradient.css", () => {
    it("uses CSS custom properties for colors", () => {
      const css = readFileSync(join(blockDir, "hero-gradient.css"), "utf-8");
      expect(css).toContain("var(--color-primary");
      expect(css).toContain("var(--color-secondary");
      expect(css).toContain("var(--color-accent");
    });

    it("is responsive", () => {
      const css = readFileSync(join(blockDir, "hero-gradient.css"), "utf-8");
      expect(css).toContain("@media");
    });
  });
});
