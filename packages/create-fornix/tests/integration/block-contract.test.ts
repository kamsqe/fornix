/**
 * Block contract harness.
 *
 * One parameterized test per block in `packages/fornix-blocks/blocks/`.
 * Six checks per block — if a block passes all six, it's safe to scaffold;
 * if it fails any, it's a known-bad block that v2 should fix or delete.
 *
 * The harness never throws — it reports. The point is producing a triage
 * table, not gating CI. (Once curation is done, this becomes a hard gate.)
 */
import { describe, it, expect } from "vitest";
import {
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { BlockManifestSchema, type BlockManifest } from "fornix-registry";
import { buildSlotSchema } from "../../src/scaffold/slot-schema.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const BLOCKS_ROOT = resolve(
  HERE,
  "..",
  "..",
  "..",
  "..",
  "packages",
  "fornix-blocks",
  "blocks",
);

const blockNames = readdirSync(BLOCKS_ROOT).filter((entry) => {
  const full = join(BLOCKS_ROOT, entry);
  return statSync(full).isDirectory();
});

/**
 * Heuristic: "looks like marketing copy that should live in content".
 *
 * We accept false negatives (let some real strings slip through) in
 * exchange for far fewer false positives — className strings and
 * Tailwind utilities were dominating the noise.
 */
function isLikelyMarketingCopy(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 6) return false;

  // CSS class strings — all lowercase, kebab/BEM/tailwind tokens, one or
  // many separated by spaces. Single-class strings like "hero-gradient__cta"
  // (no spaces) also count.
  const looksLikeCss =
    /^[a-z][a-z0-9_-]*((:|--?|__)[a-z0-9_-]+)*( +[a-z][a-z0-9_-]*((:|--?|__)[a-z0-9_-]+)*)*$/.test(
      trimmed,
    );
  if (looksLikeCss) return false;

  // `rel="noopener noreferrer"` and similar known attribute values
  if (/^(noopener|noreferrer|nofollow|external|stylesheet|preload|next|prev)(\s+(noopener|noreferrer|nofollow|external|stylesheet|preload|next|prev))*$/.test(trimmed)) {
    return false;
  }

  const hasCapitalizedWord = /\b[A-Z][a-z]{2,}/.test(trimmed);
  const hasStopword =
    /\b(the|and|or|our|your|with|for|get|now|new|all|how|why|when|what|read|learn|see|view|join|make|build|find|free|start|here|there|click|sign|log|enter|change|continue|popular|results|search|failed|please|sorry|something|try|again|loading|empty)\b/i.test(
      trimmed,
    );

  return hasCapitalizedWord || hasStopword;
}

/**
 * Color values we accept in CSS. Anything else is a literal hex/rgb that
 * should have been a palette var.
 */
const PALETTE_VAR_PATTERN = /var\(--color-[a-z-]+/;

interface ContractResult {
  block: string;
  passes: {
    manifestValid: boolean;
    filesExistOnDisk: boolean;
    contentSlotsDeclared: boolean;
    defaultContentMatchesSlots: boolean;
    noHardcodedEnglishInAstro: boolean;
    cssUsesPaletteVarsOnly: boolean;
  };
  notes: string[];
}

function checkBlock(name: string): ContractResult {
  const dir = join(BLOCKS_ROOT, name);
  const notes: string[] = [];
  const passes = {
    manifestValid: false,
    filesExistOnDisk: false,
    contentSlotsDeclared: false,
    defaultContentMatchesSlots: false,
    noHardcodedEnglishInAstro: false,
    cssUsesPaletteVarsOnly: false,
  };

  // 1. Manifest validates
  let manifest: BlockManifest | null = null;
  try {
    const raw = readFileSync(join(dir, "block.json"), "utf8");
    const parsed = BlockManifestSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      passes.manifestValid = true;
      manifest = parsed.data;
    } else {
      notes.push(`manifest: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    }
  } catch (e) {
    notes.push(`manifest: ${e instanceof Error ? e.message : "unreadable"}`);
  }

  if (!manifest) {
    return { block: name, passes, notes };
  }

  // 2. Every file in manifest.files exists on disk
  const missingFiles = manifest.files
    .map((f) => f.source)
    .filter((source) => !existsSync(join(dir, source)));
  if (missingFiles.length === 0) {
    passes.filesExistOnDisk = true;
  } else {
    notes.push(`missing files: ${missingFiles.join(", ")}`);
  }

  // 3. Has ai.contentSlots declared (for section/feature blocks — integration
  //    blocks like analytics-cf/db-d1 legitimately have none; blocks that
  //    declare their own `collections` (e.g. blog-mdx, docs-collection) bring
  //    their own content surface and don't need slots on the sections
  //    collection)
  const slots = manifest.ai?.contentSlots ?? {};
  const declaresOwnCollections =
    Array.isArray(manifest.collections) && manifest.collections.length > 0;
  if (
    manifest.type !== "section" &&
    manifest.type !== "feature"
  ) {
    passes.contentSlotsDeclared = true; // n/a for layout/integration blocks
  } else if (declaresOwnCollections) {
    passes.contentSlotsDeclared = true; // block brings its own collection
  } else if (Object.keys(slots).length > 0) {
    passes.contentSlotsDeclared = true;
  } else {
    notes.push("no contentSlots declared for section/feature block");
  }

  // 4. default-content.json matches the slot-derived schema (when both exist)
  const defaultContentPath = join(dir, "default-content.json");
  if (existsSync(defaultContentPath) && Object.keys(slots).length > 0) {
    try {
      const raw = JSON.parse(readFileSync(defaultContentPath, "utf8"));
      const schema = buildSlotSchema(slots).passthrough();
      const validation = schema.safeParse(raw);
      if (validation.success) {
        passes.defaultContentMatchesSlots = true;
      } else {
        notes.push(
          `default-content: ${validation.error.issues
            .map((i) => `${i.path.join(".")} ${i.message}`)
            .slice(0, 3)
            .join("; ")}`,
        );
      }
    } catch (e) {
      notes.push(
        `default-content unreadable: ${e instanceof Error ? e.message : "?"}`,
      );
    }
  } else {
    passes.defaultContentMatchesSlots = true; // no default content to check
  }

  // 5. No hardcoded English in .astro template body
  //    (the frontmatter is allowed to mention fields by name; the body
  //    between `---` markers is what we scan)
  //
  //    Exemptions — both have a different content contract:
  //    - layout blocks: visible strings are explicit prop fallbacks the
  //      page-author overrides
  //    - page-providing blocks (all files land under `src/pages/`): they
  //      ship Astro routes whose framing strings are configurable at the
  //      consumer level, not via a content collection
  const astroFile = manifest.files.find((f) => f.source.endsWith(".astro"));
  // A block is "page-providing" if every .astro it ships lands under
  // `src/pages/`. Companion files (content schemas, RSS endpoints) can
  // sit outside src/pages/ without disqualifying the block.
  const astroFiles = manifest.files.filter((f) =>
    f.source.endsWith(".astro"),
  );
  const isPageProviding =
    astroFiles.length > 0 &&
    astroFiles.every((f) => f.destination.startsWith("src/pages/"));
  if (manifest.type === "layout" || isPageProviding) {
    passes.noHardcodedEnglishInAstro = true;
  } else if (astroFile) {
    const astroPath = join(dir, astroFile.source);
    try {
      const astro = readFileSync(astroPath, "utf8");
      const body = stripFrontmatter(astro);
      const candidates = extractStringLiterals(body).filter(
        isLikelyMarketingCopy,
      );
      if (candidates.length === 0) {
        passes.noHardcodedEnglishInAstro = true;
      } else {
        notes.push(
          `hardcoded text in .astro: ${JSON.stringify(candidates.slice(0, 2))}`,
        );
      }
    } catch {
      notes.push("astro file unreadable");
    }
  } else {
    passes.noHardcodedEnglishInAstro = true;
  }

  // 6. CSS color values use palette vars only
  //
  // Only inspect actual color *properties* (`color:`, `background:`, etc.)
  // — NOT custom-property declarations (`--callout-bg: rgba(...)`), which
  // are block-local design tokens and legitimately set literal values.
  // Black/white/transparent shadows and overlays are palette-agnostic.
  const cssFile = manifest.files.find((f) => f.source.endsWith(".css"));
  if (cssFile) {
    const cssPath = join(dir, cssFile.source);
    try {
      const css = readFileSync(cssPath, "utf8");
      const colorPropertyLines = css.split("\n").filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("/*") || trimmed.startsWith("//")) return false;
        if (/^--[a-z][a-z0-9-]*\s*:/.test(trimmed)) return false; // var def, not property usage
        return /^(color|background(-color)?|border(-color|-top-color|-right-color|-bottom-color|-left-color)?|outline-color|fill|stroke|caret-color)\s*:/i.test(
          trimmed,
        );
      });

      const literalColorRe =
        /(#[0-9a-fA-F]{3,8}|\brgba?\([^)]+\)|\bhsla?\([^)]+\))/;
      const bad = colorPropertyLines.filter(
        (line) =>
          literalColorRe.test(line) &&
          !PALETTE_VAR_PATTERN.test(line) &&
          // Palette-agnostic literals (transparent overlays, pure black/white)
          !/(rgba?\(\s*(0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)|#fff(fff)?\b|#000(000)?\b|transparent)/i.test(
            line,
          ),
      );
      if (bad.length === 0) {
        passes.cssUsesPaletteVarsOnly = true;
      } else {
        notes.push(`literal colors in CSS: ${bad.length} line(s) — ${bad[0].trim().slice(0, 60)}`);
      }
    } catch {
      notes.push("css file unreadable");
    }
  } else {
    passes.cssUsesPaletteVarsOnly = true; // no css → vacuously true
  }

  return { block: name, passes, notes };
}

function stripFrontmatter(astro: string): string {
  const m = astro.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return m ? m[1] : astro;
}

/**
 * Best-effort string-literal extractor for an .astro template body.
 * We're looking for marketing copy stuffed directly between tags
 * (e.g. `>Continue Reading<`) or in static attributes
 * (e.g. `placeholder="Search..."`). False positives are fine — the
 * harness reports, doesn't gate.
 */
function extractStringLiterals(body: string): string[] {
  const out: string[] = [];

  // > text < between tags
  for (const m of body.matchAll(/>([^<>{}\n]{6,}?)</g)) {
    out.push(m[1].trim());
  }

  // attribute="value"
  for (const m of body.matchAll(/\b\w+="([^"{}\n]{6,}?)"/g)) {
    out.push(m[1].trim());
  }

  return out
    .filter((s) => s.length > 0)
    // Skip URLs, identifiers, file paths, hex codes, CSS class strings, etc.
    .filter((s) => !/^[/.#]/.test(s))
    .filter((s) => !/^[a-z][a-z0-9-]*$/.test(s))
    .filter((s) => !/^\{.*\}$/.test(s));
}

// ── Tests ────────────────────────────────────────────────

describe("block contract — fornix-blocks library", () => {
  const allResults: ContractResult[] = [];

  for (const name of blockNames) {
    it(`block "${name}"`, () => {
      const result = checkBlock(name);
      allResults.push(result);
      // Always-passing assertion — the harness reports rather than gates.
      // Real per-check assertions arrive once curation is done.
      expect(result.block).toBe(name);
    });
  }

  it("triage summary", () => {
    const rows = allResults.map((r) => ({
      block: r.block,
      score: Object.values(r.passes).filter(Boolean).length,
      ...r.passes,
      notes: r.notes,
    }));

    const failures = rows.filter((r) => r.score < 6);
    const passing = rows.filter((r) => r.score === 6);

    /* eslint-disable no-console */
    console.log("\n━━━ Block contract triage ━━━");
    console.log(`Total: ${rows.length}, passing 6/6: ${passing.length}, failing: ${failures.length}\n`);

    if (failures.length > 0) {
      console.log("Failing blocks:");
      for (const r of failures.sort((a, b) => a.score - b.score)) {
        console.log(`  [${r.score}/6] ${r.block}`);
        for (const note of r.notes) console.log(`        · ${note}`);
      }
    }

    if (passing.length > 0) {
      console.log(`\nPassing 6/6: ${passing.map((r) => r.block).join(", ")}`);
    }
    /* eslint-enable no-console */

    expect(rows.length).toBe(blockNames.length);
  });
});
