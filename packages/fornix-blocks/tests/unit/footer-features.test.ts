import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BlockManifestSchema } from "fornix-registry";

const BLOCKS_DIR = join(__dirname, "../../blocks");

// ── Shared helpers ──────────────────────────────────────

function loadManifest(blockName: string): ReturnType<typeof JSON.parse> {
  const raw = readFileSync(join(BLOCKS_DIR, blockName, "block.json"), "utf-8");
  return JSON.parse(raw);
}

function loadAstro(blockName: string): string {
  return readFileSync(join(BLOCKS_DIR, blockName, `${blockName}.astro`), "utf-8");
}

function loadCss(blockName: string): string {
  return readFileSync(join(BLOCKS_DIR, blockName, `${blockName}.css`), "utf-8");
}

function checkNoHardcodedText(blockName: string): void {
  const astroContent = loadAstro(blockName);
  const parts = astroContent.split("---");
  const template = parts[2] ?? "";

  // Forbidden user-facing text patterns
  const forbiddenPatterns = [
    />\s*Welcome\b/i,
    />\s*Get Started\b/i,
    />\s*Hello\b/i,
    />\s*Click here\b/i,
    />\s*Lorem ipsum/i,
    />\s*Subscribe\b/i,
  ];

  for (const pattern of forbiddenPatterns) {
    expect(pattern.test(template), `Found hardcoded text: ${pattern}`).toBe(false);
  }

  // Check for bare text between tags (excluding CSS @import, comments, selectors)
  const textBetweenTags = template.match(/>([^<{]+)</g) ?? [];
  const hardcoded = textBetweenTags
    .map((m) => m.replace(/^>/, "").replace(/<$/, "").trim())
    .filter((t) => /[a-zA-Z]{3,}/.test(t))
    .filter((t) => !t.startsWith("@import"))
    .filter((t) => !t.startsWith("/*"))
    .filter((t) => !t.startsWith("."));
  expect(hardcoded, `Found bare text in ${blockName}.astro`).toEqual([]);
}

// ── footer-minimal ──────────────────────────────────────

describe("footer-minimal block", () => {
  const blockName = "footer-minimal";

  describe("block.json", () => {
    it("parses against BlockManifestSchema", () => {
      const parsed = loadManifest(blockName);
      const result = BlockManifestSchema.safeParse(parsed);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("footer-minimal");
        expect(result.data.type).toBe("section");
        expect(result.data.category).toBe("footer");
      }
    });

    it("has AI metadata with content slots", () => {
      const parsed = loadManifest(blockName);
      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.contentSlots.copyright).toBeDefined();
      expect(parsed.ai.contentSlots.links).toBeDefined();
    });

    it("has files array with correct destinations", () => {
      const parsed = loadManifest(blockName);
      expect(parsed.files.length).toBe(2);
      expect(parsed.files[0].destination).toBe("src/components/sections/footer-minimal.astro");
      expect(parsed.files[1].destination).toBe("src/styles/sections/footer-minimal.css");
    });
  });

  describe("footer-minimal.astro", () => {
    it("contains no hardcoded text strings", () => {
      checkNoHardcodedText(blockName);
    });

    it("reads content from content collection", () => {
      const astro = loadAstro(blockName);
      expect(astro).toContain("getEntry");
      expect(astro).toContain("sections");
      expect(astro).toContain("footer-minimal");
    });
  });

  describe("default-content.json", () => {
    it("has all required content fields", () => {
      const raw = readFileSync(join(BLOCKS_DIR, blockName, "default-content.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.copyright).toBeTruthy();
      expect(Array.isArray(parsed.links)).toBe(true);
      expect(parsed.links.length).toBeGreaterThan(0);
    });
  });

  describe("footer-minimal.css", () => {
    it("uses CSS custom properties for colors", () => {
      const css = loadCss(blockName);
      expect(css).toContain("var(--color-");
    });

    it("is responsive", () => {
      const css = loadCss(blockName);
      expect(css).toContain("@media");
    });
  });
});

// ── features-grid ───────────────────────────────────────

describe("features-grid block", () => {
  const blockName = "features-grid";

  describe("block.json", () => {
    it("parses against BlockManifestSchema", () => {
      const parsed = loadManifest(blockName);
      const result = BlockManifestSchema.safeParse(parsed);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("features-grid");
        expect(result.data.type).toBe("section");
        expect(result.data.category).toBe("features");
      }
    });

    it("has AI metadata with content slots", () => {
      const parsed = loadManifest(blockName);
      expect(parsed.ai).toBeDefined();
      expect(parsed.ai.contentSlots.headline).toBeDefined();
      expect(parsed.ai.contentSlots.features).toBeDefined();
    });

    it("has files array with correct destinations", () => {
      const parsed = loadManifest(blockName);
      expect(parsed.files.length).toBe(2);
      expect(parsed.files[0].destination).toBe("src/components/sections/features-grid.astro");
      expect(parsed.files[1].destination).toBe("src/styles/sections/features-grid.css");
    });
  });

  describe("features-grid.astro", () => {
    it("contains no hardcoded text strings", () => {
      checkNoHardcodedText(blockName);
    });

    it("reads content from content collection", () => {
      const astro = loadAstro(blockName);
      expect(astro).toContain("getEntry");
      expect(astro).toContain("sections");
      expect(astro).toContain("features-grid");
    });
  });

  describe("default-content.json", () => {
    it("has all required content fields", () => {
      const raw = readFileSync(join(BLOCKS_DIR, blockName, "default-content.json"), "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.headline).toBeTruthy();
      expect(Array.isArray(parsed.features)).toBe(true);
      expect(parsed.features.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("features-grid.css", () => {
    it("uses CSS custom properties for colors", () => {
      const css = loadCss(blockName);
      expect(css).toContain("var(--color-");
    });

    it("is responsive", () => {
      const css = loadCss(blockName);
      expect(css).toContain("@media");
    });
  });
});

// ── Cross-block: no conflicts ───────────────────────────

describe("block combinations — no conflicts", () => {
  const allBlocks = ["hero-gradient", "footer-minimal", "features-grid"];

  it("no CSS class name collisions between blocks", () => {
    const classesByBlock: Record<string, Set<string>> = {};

    for (const blockName of allBlocks) {
      const css = loadCss(blockName);
      const classNames = new Set<string>();
      const classMatches = css.matchAll(/\.([a-z][a-z0-9_-]+)/g);
      for (const match of classMatches) {
        classNames.add(match[1]);
      }
      classesByBlock[blockName] = classNames;
    }

    // Check each pair of blocks for class collisions
    for (let i = 0; i < allBlocks.length; i++) {
      for (let j = i + 1; j < allBlocks.length; j++) {
        const aName = allBlocks[i];
        const bName = allBlocks[j];
        const aClasses = classesByBlock[aName];
        const bClasses = classesByBlock[bName];

        const overlap = new Set([...aClasses].filter((c) => bClasses.has(c)));
        expect(
          overlap.size,
          `CSS class collision between ${aName} and ${bName}: ${[...overlap].join(", ")}`
        ).toBe(0);
      }
    }
  });

  it("no file destination collisions between blocks", () => {
    const destinations = new Set<string>();

    for (const blockName of allBlocks) {
      const manifest = loadManifest(blockName);
      for (const file of manifest.files) {
        expect(
          destinations.has(file.destination),
          `File destination collision: ${file.destination} from ${blockName}`
        ).toBe(false);
        destinations.add(file.destination);
      }
    }
  });

  it("no content collection key collisions", () => {
    // Each block reads from a unique content key (its own name)
    for (const blockName of allBlocks) {
      const astro = loadAstro(blockName);
      expect(astro).toContain(`"${blockName}"`);
    }
  });

  it("all 3 block manifests parse independently", () => {
    for (const blockName of allBlocks) {
      const parsed = loadManifest(blockName);
      const result = BlockManifestSchema.safeParse(parsed);
      expect(result.success, `${blockName} manifest failed validation`).toBe(true);
    }
  });
});
