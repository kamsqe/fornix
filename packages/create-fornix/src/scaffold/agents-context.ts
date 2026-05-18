/**
 * Emits the per-project AI-editor context files that ship with every
 * scaffold:
 *
 *   - AGENTS.md                        — the multi-agent convention
 *   - CLAUDE.md                        — read by Claude Code on session start
 *   - .cursor/rules/fornix.mdc         — read by Cursor on every prompt
 *   - .fornix/project.json             — machine-readable manifest for the
 *                                        Fornix CLI's future subcommands
 *
 * The first three carry the same human-readable body (different filenames,
 * same content) so any agent that reads any of these files is fully briefed.
 * Duplication is deliberate — these files exist for tools that don't
 * cross-read each other.
 *
 * The body is project-specific: it names the blocks installed, the pages
 * routed, the palette tokens available, the brand voice. An agent should
 * be able to onboard in a single read.
 */

import type { RenderPlan } from "./render-plan.js";

interface AiContextFiles {
  "AGENTS.md": string;
  "CLAUDE.md": string;
  ".cursor/rules/fornix.mdc": string;
  ".fornix/project.json": string;
}

export function renderAiContextFiles(plan: RenderPlan): AiContextFiles {
  const body = renderContextBody(plan);
  const manifest = renderProjectManifest(plan);

  return {
    "AGENTS.md": body,
    "CLAUDE.md": body,
    ".cursor/rules/fornix.mdc": renderCursorMdc(body, plan),
    ".fornix/project.json": manifest,
  };
}

// ── Body (shared across AGENTS.md, CLAUDE.md, .cursor/rules/fornix.mdc) ──

function renderContextBody(plan: RenderPlan): string {
  const archetype = plan.siteConfig.archetype ?? "custom";
  const brand = plan.siteConfig.name;
  const tagline = plan.siteConfig.tagline ?? "";

  // Unique blocks across all pages.
  const allBlocks = new Map<string, RenderPlan["pages"][number]["sectionBlocks"][number]>();
  for (const page of plan.pages) {
    for (const block of page.sectionBlocks) {
      allBlocks.set(block.manifest.name, block);
    }
  }
  const blocks = Array.from(allBlocks.values());

  return [
    `# ${brand} — agent context`,
    "",
    `> Scaffolded with [Fornix](https://github.com/anthropics/fornix). This file is the canonical onboarding artifact for any AI agent (Claude Code, Cursor, etc.) working in this repository. Read this once and you'll know how the project is shaped, where things live, and what conventions to follow.`,
    "",
    `If you only have one minute, jump to **[How do I add X?](#how-do-i-add-x)**.`,
    "",
    "---",
    "",
    "## What this project is",
    "",
    `- **Brand:** ${brand}`,
    tagline ? `- **Voice:** ${tagline}` : "",
    `- **Archetype:** \`${archetype}\` — see \`.fornix/project.json\` for the machine-readable manifest.`,
    `- **Stack:** Astro v5 (static output), Tailwind v4 (\`@tailwindcss/vite\`), zero runtime framework dependency. Every component is a server-rendered \`.astro\` file.`,
    `- **Palette:** \`${plan.palette.name}\` (${plan.palette.mode} mode). All colors, fonts, radii, and motion read from CSS custom properties — never hardcoded.`,
    `- **Locales:** ${plan.locales.map((l) => `\`${l}\``).join(", ")} (default: \`${plan.locale}\`).`,
    `- **Pages:** ${plan.pages.length} routed page${plan.pages.length === 1 ? "" : "s"} — ${plan.pages.map((p) => `\`/${p.slug || ""}\``).join(", ")}.`,
    "",
    "---",
    "",
    "## File map",
    "",
    "```",
    "src/",
    "├── site.config.ts              ← Single source of truth for brand/nav/CTAs/social/legal",
    "├── content.config.ts           ← Astro content-collection schema (Zod, generated from block slot schemas)",
    "├── layouts/",
    "│   └── Layout.astro             ← <html> shell, font loading, palette stylesheet link",
    "├── pages/                       ← One .astro file per routed page; locale subdirs for non-default locales",
    plan.pages.map((p) => `│   ├── ${p.slug ? `${p.slug}.astro` : "index.astro"}`).join("\n"),
    "├── components/",
    "│   ├── primitives/              ← 8 typed primitives every block composes (see below)",
    "│   └── sections/                ← Block .astro files (one per block); never edit in place — see conventions",
    "├── content/",
    "│   └── sections/<locale>/       ← JSON sidecars; one per (locale × block); read by blocks via getEntry()",
    "└── styles/",
    "    └── global.css                ← Tailwind import + palette-aware font imports + @layer base",
    "",
    "public/",
    "└── styles/palettes/             ← Built palette CSS (palette tokens as :root custom properties)",
    "",
    ".fornix/                         ← Fornix CLI scaffold manifest (read by `fornix add` subcommands)",
    "```",
    "",
    "---",
    "",
    "## The block system",
    "",
    "A **block** is a self-contained page section. This project ships with the following blocks (installed under `src/components/sections/`):",
    "",
    blocks
      .map((b) => `- \`${b.manifest.name}\` — ${b.manifest.description}`)
      .join("\n"),
    "",
    "Each block:",
    "",
    "1. Lives at `src/components/sections/<block-name>.astro`",
    "2. Reads its locale content from `src/content/sections/<locale>/<block-name>.json` via `getEntry()`",
    "3. Reads brand/nav/legal from `src/site.config.ts`",
    "4. Uses primitives (`<Container>`, `<Section>`, `<Headline>`, `<Eyebrow>`, `<Button>`, `<Card>`, `<Badge>`, `<Icon>`) instead of bare HTML where possible",
    "5. Uses BEM-style class names: `fnx-<block>__<element>--<modifier>`",
    "6. References palette tokens only (`var(--color-primary)`) — never literal hex/rgb",
    "",
    "---",
    "",
    "## Primitives",
    "",
    "Eight hand-built components under `src/components/primitives/`. Every block composes them. Treat them as the shadcn-ish layer for this project.",
    "",
    "| Primitive | Purpose |",
    "|---|---|",
    "| `Container` | Width-constrained wrapper. Sizes: `narrow` / `default` / `wide` / `full`. |",
    "| `Section` | Vertical band. Variants: `default` / `alt` / `accent`. Spacing: `compact` / `default` / `spacious`. |",
    "| `Headline` | Display headline. Levels: `1` / `2` / `3`. Measure: `narrow` / `comfortable` / `wide`. |",
    "| `Eyebrow` | Tiny uppercase label above headlines. Color: `accent` / `muted` / `primary`. |",
    "| `Button` | Variants: `primary` / `secondary` / `ghost`. Sizes: `default` / `lg`. Renders as `<a>` or `<button>` depending on props. |",
    "| `Card` | Variants: `bordered` / `lifted` / `featured` / `interactive`. |",
    "| `Badge` | Small status pill. |",
    "| `Icon` | 12 inline SVGs by `name`: `check`, `arrow-right`, `chevron-down`, `chevron-up`, `external-link`, `menu`, `x`, `play`, `star`, `mail`, `phone`, `map-pin`. |",
    "",
    "---",
    "",
    "## Palette tokens",
    "",
    "Every primitive and every block reads from CSS custom properties defined in `public/styles/palettes/_current.css`. Available tokens:",
    "",
    "**Colors** (derived tokens use `color-mix()` against these five):",
    "- `--color-primary`, `--color-secondary`, `--color-accent`, `--color-background`, `--color-foreground`",
    "- `--color-surface`, `--color-muted`, `--color-border`, `--color-on-primary` (derived; safe to read)",
    "",
    "**Typography**:",
    "- `--font-headline`, `--font-headline-weight`, `--font-body`, `--font-body-weight`",
    "",
    "**Radius** (use for `border-radius`):",
    "- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`",
    "",
    "**Motion**:",
    "- `--duration-fast`, `--duration-normal`, `--duration-slow`",
    "- `--easing-default`",
    "",
    "**Shadow** (use for `box-shadow`):",
    "- `--shadow-sm`, `--shadow-md`, `--shadow-lg`",
    "",
    "When in doubt, read `public/styles/palettes/_current.css` directly — that file is generated and lists every token.",
    "",
    "---",
    "",
    "## How do I add X?",
    "",
    "### A new section to an existing page",
    "",
    "1. Pick or create a block under `src/components/sections/<new-block>.astro`.",
    "2. If the block reads content, add a JSON sidecar at `src/content/sections/<locale>/<new-block>.json` per locale.",
    "3. Import the block at the top of the page (`src/pages/<page>.astro`) and render it: `<NewBlock />`.",
    "4. Astro's collection schema is in `src/content.config.ts` — if your new block uses unfamiliar slot names, append to that schema (`.passthrough()` is permissive but explicit is better).",
    "",
    "### A new page",
    "",
    "1. Create `src/pages/<slug>.astro`. Use an existing page as a template — they all import from `../layouts/Layout.astro` and render blocks in order.",
    "2. Add the route to the nav under `src/site.config.ts` if it should appear in the global header.",
    "3. Astro auto-routes — no router config needed.",
    "",
    "### A new color or font",
    "",
    "Don't. Edit the palette JSON instead. Palettes live one layer up under `node_modules/fornix-registry/palettes/` (or the bundled CLI). To customize:",
    "",
    "1. Copy `public/styles/palettes/_current.css` to a new name (e.g. `_custom.css`).",
    "2. Edit the `:root` custom properties.",
    "3. Update the `<link>` tag in `src/layouts/Layout.astro` to point at the new file.",
    "",
    "### A new locale",
    "",
    "1. Add the locale code to `astro.config.mjs` (`i18n.locales`) and `src/site.config.ts` (`locale.supported`).",
    "2. Create `src/content/sections/<new-locale>/<block>.json` for each block (copy from an existing locale and translate).",
    "3. Astro's file-based routing auto-emits `<new-locale>/<slug>` URLs because each page reads `Astro.currentLocale`.",
    "",
    "---",
    "",
    "## Conventions (the agent's rulebook)",
    "",
    "- **No hardcoded colors.** Always `var(--color-*)`. If you find one in the codebase, fix it.",
    "- **No literal font-family.** Always `var(--font-headline)` or `var(--font-body)`.",
    "- **No literal border-radius/shadow/duration values.** Use the tokens.",
    "- **BEM class names.** Pattern: `fnx-<block>__<element>--<modifier>`. Don't introduce new naming conventions per block.",
    "- **Astro scoped styles** are the default — every block has a `<style>` block scoped via `data-astro-cid-*`. Don't lift styles into global.css unless they're truly shared.",
    "- **No new JS dependencies** without a real reason. The project is intentionally near-zero-runtime; if a block needs interactivity, write it as a `<script type=\"module\">` inside the `.astro` (see `header-sticky` for the pattern).",
    "- **Edit `site.config.ts`, not the blocks**, when changing brand/nav/CTAs. The blocks read from it.",
    "- **Edit the JSON sidecars under `src/content/sections/`**, not the blocks, when changing copy.",
    "- **No emoji in code or content** unless the user explicitly asks for them.",
    "- **`prefers-reduced-motion`** is respected by every primitive. Don't add new motion without honoring it.",
    "- **a11y first.** Every interactive element has a focus-visible outline, every nav has an `aria-label`, every icon has `aria-hidden` unless it's the sole carrier of meaning.",
    "",
    "---",
    "",
    "## What to avoid",
    "",
    "- **Don't rewrite blocks in place.** If a block needs a different layout, create a new block (`hero-text-alt`, `pricing-table-compact`) and use it on the relevant page. Blocks are versioned; edits in place lose that.",
    "- **Don't move `site.config.ts`.** Many blocks import from `../../site.config` directly.",
    "- **Don't add a UI library** (shadcn-ui, daisy, headless-ui). The primitives are the design system for this project; extending them is a more honest path than adding a sibling.",
    "- **Don't strip `data-astro-cid-*` attributes** from rendered HTML — Astro relies on them for style scoping.",
    "- **Don't bypass the content-collection schema** in `src/content.config.ts`. If your block needs a new slot, add it to the schema first.",
    "",
    "---",
    "",
    `Generated by Fornix · archetype \`${archetype}\` · palette \`${plan.palette.name}\` · ${new Date().toISOString().slice(0, 10)}`,
    "",
  ]
    .filter((line) => line !== "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

// ── Cursor .mdc wrapper (frontmatter + body) ──────────────

function renderCursorMdc(body: string, plan: RenderPlan): string {
  const archetype = plan.siteConfig.archetype ?? "custom";
  return [
    "---",
    `description: ${plan.siteConfig.name} — Fornix-scaffolded ${archetype} site. Conventions, file map, palette tokens, and block system.`,
    'globs: "**/*"',
    "alwaysApply: true",
    "---",
    "",
    body,
  ].join("\n");
}

// ── Machine-readable project manifest ─────────────────────

function renderProjectManifest(plan: RenderPlan): string {
  const allBlocks = new Map<string, RenderPlan["pages"][number]["sectionBlocks"][number]>();
  for (const page of plan.pages) {
    for (const block of page.sectionBlocks) {
      allBlocks.set(block.manifest.name, block);
    }
  }

  const manifest = {
    schemaVersion: 1,
    fornixVersion: "0.4.0",
    scaffoldedAt: new Date().toISOString(),
    projectName: plan.projectName,
    brand: plan.siteConfig.name,
    archetype: plan.siteConfig.archetype ?? "custom",
    palette: plan.palette.name,
    paletteMode: plan.palette.mode,
    locales: {
      default: plan.locale,
      supported: [...plan.locales],
    },
    deployTarget: plan.deployTarget,
    pages: plan.pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      blocks: p.sectionBlocks.map((b) => b.manifest.name),
    })),
    blocks: Array.from(allBlocks.values()).map((b) => ({
      name: b.manifest.name,
      version: b.manifest.version,
      category: b.manifest.category,
      description: b.manifest.description,
    })),
  };

  return JSON.stringify(manifest, null, 2) + "\n";
}
