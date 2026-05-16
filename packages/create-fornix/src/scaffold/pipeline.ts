import type { BlockManifest } from "fornix-registry";

import type { RenderPlan } from "./render-plan.js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { loadTemplate, fillTemplate } from "./templates.js";
import { zodObjectForSlots, mergeSlots } from "./zod-from-slots.js";
import { primitivesDir } from "./workspace.js";

/**
 * Map from project-relative path → UTF-8 file contents.
 * The single output type of the (pure) scaffold pipeline.
 */
export type FileMap = Record<string, string>;

/**
 * Project a RenderPlan into a FileMap.
 *
 * Pure function — no I/O. The result is what `writer.ts` then commits to disk.
 */
export function renderToFiles(plan: RenderPlan): FileMap {
  const files: FileMap = {};

  // ── Palette ──────────────────────────────────────────────
  // Lives in `public/` so the Layout's <link rel="stylesheet"> tag finds it
  // at the URL `/styles/palettes/_current.css` after build.
  files[`public/styles/palettes/_current.css`] = plan.palette.css;
  files[`public/styles/palettes/${plan.palette.name}.css`] = plan.palette.css;

  // ── Layout ───────────────────────────────────────────────
  files["src/layouts/Layout.astro"] = fillTemplate(
    loadTemplate("layout.astro"),
    {
      defaultLocale: plan.locale,
      colorScheme: plan.palette.mode,
    },
  );

  // ── global.css (Tailwind v4 + palette-aware font imports) ────
  files["src/styles/global.css"] = fillTemplate(loadTemplate("global.css"), {
    fontImports: renderFontImports(plan.palette.name),
  });

  // ── Page emission (one .astro per page × per locale) ────
  // For each (page, locale) we generate one file. The home page goes at
  // `src/pages/index.astro`; secondary pages at `src/pages/{slug}.astro`.
  // For non-default locales the locale segment is prepended.
  const indexTemplate = loadTemplate("index.astro");
  for (const page of plan.pages) {
    const { blockImports, blockRenders } = renderBlockSlotsForPage(page);
    const isHome = page.slug === "";
    const pageFile = isHome ? "index.astro" : `${page.slug}.astro`;

    for (const locale of plan.locales) {
      const isDefaultLocale = locale === plan.locale;
      const indexPath = isDefaultLocale
        ? `src/pages/${pageFile}`
        : `src/pages/${locale}/${pageFile}`;

      // Depth from src/pages/... to src/layouts/Layout.astro:
      //   src/pages/index.astro                → ../layouts/...
      //   src/pages/pricing.astro              → ../layouts/...
      //   src/pages/about/team.astro           → ../../layouts/...
      //   src/pages/es/index.astro             → ../../layouts/...
      //   src/pages/es/about/team.astro        → ../../../layouts/...
      const depth =
        pageFile.split("/").length - 1 + (isDefaultLocale ? 0 : 1);
      const layoutPath = `${"../".repeat(depth + 1)}layouts/Layout.astro`;
      const finalImports =
        depth === 0
          ? blockImports
          : adjustImportsForDepth(blockImports, depth);

      files[indexPath] = fillTemplate(indexTemplate, {
        layoutPath,
        blockImports: finalImports,
        blockRenders,
        title: page.title,
        description: page.description,
      });
    }
  }

  // ── astro.config.mjs ─────────────────────────────────────
  files["astro.config.mjs"] = fillTemplate(loadTemplate("astro.config.mjs"), {
    output: "static",
    site: "https://example.com",
    defaultLocale: plan.locale,
    localesArray: plan.locales.map((l) => JSON.stringify(l)).join(", "),
  });

  // ── package.json ─────────────────────────────────────────
  files["package.json"] = fillTemplate(loadTemplate("package.json"), {
    projectName: plan.projectName,
    dependencies: renderDependencies(plan.dependencies),
  });

  // ── tsconfig.json ────────────────────────────────────────
  files["tsconfig.json"] = loadTemplate("tsconfig.json");

  // ── content.config.ts ────────────────────────────────────
  const { schemaDeclarations, sectionsSchema } = renderContentSchema(plan);
  files["src/content.config.ts"] = fillTemplate(
    loadTemplate("content.config.ts"),
    { schemaDeclarations, sectionsSchema },
  );

  // ── src/site.config.ts ───────────────────────────────────
  // The single source of truth for site-wide brand/nav/CTAs/social/legal.
  // Every block (once rewritten in v0.3 week 2) reads from this.
  files["src/site.config.ts"] = fillTemplate(loadTemplate("site.config.ts"), {
    siteConfigJson: JSON.stringify(plan.siteConfig, null, 2),
  });

  // ── .gitignore ───────────────────────────────────────────
  files[".gitignore"] = loadTemplate("gitignore");

  // ── Primitives (copied into every scaffold) ──────────────
  // Every scaffold gets the full primitive set under
  // `src/components/primitives/`. Blocks (once rewritten) import siblings:
  //   import Container from "../primitives/Container.astro"
  for (const [name, contents] of Object.entries(loadPrimitives())) {
    files[`src/components/primitives/${name}`] = contents;
  }

  // ── wrangler.json (Cloudflare Pages) ─────────────────────
  if (plan.deployTarget === "cloudflare") {
    files["wrangler.json"] = fillTemplate(loadTemplate("wrangler.json"), {
      projectName: plan.projectName,
      compatibilityDate: cloudflareCompatibilityDate(),
    });
  }

  // ── Block source files (copied once across all pages) ───
  // Collect unique blocks across all pages — each one gets copied a single
  // time even if multiple pages render it (header on every page, etc.).
  const allBlocks = new Map<string, RenderPlan["pages"][number]["sectionBlocks"][number]>();
  for (const page of plan.pages) {
    for (const block of page.sectionBlocks) {
      allBlocks.set(block.manifest.name, block);
    }
  }
  for (const block of allBlocks.values()) {
    for (const fileSpec of block.manifest.files) {
      const content = block.files[fileSpec.source];
      if (content === undefined) {
        throw new Error(
          `Block "${block.manifest.name}" declares file "${fileSpec.source}" but it wasn't present in the loaded sources.`,
        );
      }
      files[fileSpec.destination] = content;
    }
  }

  // ── Content entries (JSON) ───────────────────────────────
  for (const entry of plan.contentEntries) {
    files[entry.path] = JSON.stringify(entry.data, null, 2) + "\n";
  }

  return files;
}

// ── Helpers ──────────────────────────────────────────────

function renderBlockSlotsForPage(
  page: RenderPlan["pages"][number],
): {
  blockImports: string;
  blockRenders: string;
} {
  const imports: string[] = [];
  const renders: string[] = [];
  for (const block of page.sectionBlocks) {
    const component = blockToComponentName(block.manifest.name);
    const astroFile = block.manifest.files.find((f) =>
      f.source.endsWith(".astro"),
    );
    if (!astroFile) continue;
    const relImport = relativeFromPages(astroFile.destination);
    imports.push(`import ${component} from "${relImport}";`);
    renders.push(`  <${component} />`);
  }
  return {
    blockImports: imports.join("\n"),
    blockRenders: renders.join("\n"),
  };
}

function renderDependencies(deps: Record<string, string>): string {
  return Object.entries(deps)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => `    ${JSON.stringify(name)}: ${JSON.stringify(version)}`)
    .join(",\n");
}

function renderContentSchema(plan: RenderPlan): {
  schemaDeclarations: string;
  sectionsSchema: string;
} {
  // Collect unique blocks across all pages — schemas merge once.
  const uniqueBlocks = new Set<typeof plan.pages[number]["sectionBlocks"][number]>();
  for (const page of plan.pages) {
    for (const block of page.sectionBlocks) uniqueBlocks.add(block);
  }
  const perBlock = Array.from(uniqueBlocks)
    .map((b) => b.manifest.ai?.contentSlots)
    .filter((slots): slots is NonNullable<typeof slots> => !!slots);

  if (perBlock.length === 0) {
    return { schemaDeclarations: "", sectionsSchema: "z.record(z.unknown())" };
  }

  const merged = mergeSlots(perBlock);
  // `.passthrough()` keeps fields not declared in the merged schema. The
  // alternative — `.strict()` — would reject blocks added in later sessions
  // whose slots aren't yet in the merged map.
  const sectionsSchema = `${zodObjectForSlots(merged)}.passthrough()`;
  return { schemaDeclarations: "", sectionsSchema };
}

function blockToComponentName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Read every `.astro` (and supporting `.css` / `.ts`) file from the bundled
 * primitives directory. Returned as a map of filename → contents.
 */
function loadPrimitives(): Record<string, string> {
  const dir = primitivesDir();
  const out: Record<string, string> = {};
  for (const entry of readdirSync(dir)) {
    if (entry === ".gitkeep") continue;
    if (!/\.(astro|css|ts)$/.test(entry)) continue;
    out[entry] = readFileSync(join(dir, entry), "utf8");
  }
  return out;
}

/**
 * Render the @import block for the global.css template based on which
 * palette is loaded. Inter is always pulled in; the headline font (if any)
 * is added per palette.
 *
 * Kept in lockstep with `render-plan.ts::fontsourceDepsForPaletteName`.
 */
function renderFontImports(paletteName: string): string {
  const lines: string[] = [
    `@import "@fontsource/inter/400.css";`,
    `@import "@fontsource/inter/600.css";`,
    `@import "@fontsource/inter/700.css";`,
    `@import "@fontsource/inter/800.css";`,
  ];
  switch (paletteName) {
    case "fraktur":
      lines.push(`@import "@fontsource/fraunces/600.css";`);
      break;
    case "ember":
      lines.push(`@import "@fontsource/archivo-black/400.css";`);
      break;
    case "terracotta":
      lines.push(`@import "@fontsource/dm-serif-display/400.css";`);
      break;
  }
  return lines.join("\n");
}

/**
 * The day's `compatibility_date` for the generated `wrangler.json`. Locks the
 * project to today's Cloudflare Workers feature set; users can bump it later.
 */
function cloudflareCompatibilityDate(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function relativeFromPages(destination: string): string {
  // `src/components/sections/hero-gradient.astro` → `../components/sections/hero-gradient.astro`
  // since the importer lives at `src/pages/index.astro`.
  if (!destination.startsWith("src/")) {
    throw new Error(`Block destination must live under src/: ${destination}`);
  }
  return "../" + destination.slice("src/".length);
}

/**
 * Pages nested below `src/pages/` (locale sub-dirs, slugged subdirs like
 * `about/team.astro`) need additional `../` prefixes on their relative
 * imports. `depth` is the number of extra levels beyond `src/pages/`.
 */
function adjustImportsForDepth(imports: string, depth: number): string {
  if (depth <= 0) return imports;
  const extra = "../".repeat(depth);
  return imports.replace(/from "\.\.\//g, `from "../${extra}`);
}

/**
 * Legacy alias kept for any out-of-tree callers; new code uses
 * `adjustImportsForDepth(imports, 1)` directly.
 */
function adjustImportsForNestedPage(imports: string): string {
  return imports.replace(/from "\.\.\//g, 'from "../../');
}
