<p align="center">
  <h1 align="center">Fornix</h1>
  <p align="center">AI-first CLI that scaffolds Astro projects from a curated block library</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/create-fornix"><img src="https://img.shields.io/npm/v/create-fornix.svg?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/kamsqe/fornix/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
</p>

---

## What is Fornix?

Describe your site in one sentence. Fornix picks the right blocks, picks a palette, writes the copy with AI, and gives you a working Astro project. No templates, no scaffolding boilerplate — just a deployable site that says what you actually want it to say.

```bash
npx create-fornix my-site --prompt "Compliance-first fintech for early-stage startups"
```

Out of the box you get:

- An Astro project that **builds clean** (`npm install && npm run build` works)
- One of 32 curated palettes wired through CSS custom properties (light + dark)
- 42 hand-curated blocks (hero, features, pricing, testimonials, FAQ, footer, …)
- Per-locale content collections wired through `Astro.currentLocale`
- AI-generated copy per block, per locale, validated against each block's content schema
- A `dist/` directory ready for `wrangler pages deploy` or any static host

## Quick start

### Just hand me defaults

```bash
npx create-fornix my-site --yes
cd my-site && npm install && npm run dev
```

You get a 4-block landing page (hero, features, CTA, footer) on the `midnight` palette with placeholder copy. Good for "does the spine work" — replace as you go.

### Pick your blocks and palette

```bash
npx create-fornix my-site \
  --blocks hero-gradient,features-grid,pricing-table,faq-accordion,cta-banner,footer-minimal \
  --palette corporate-blue \
  --yes
```

### AI mode (needs an Anthropic API key)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx create-fornix lexura \
  --prompt "AI dispute resolution platform for small businesses, professional tone" \
  --blocks hero-gradient,features-grid,pricing-table,faq-accordion,cta-banner,footer-minimal \
  --palette midnight \
  --yes
```

Each block gets real copy generated against its declared `contentSlots` — `maxLength`, examples, and descriptions are forwarded to the model, and responses are validated against a Zod schema derived from the same slots. If validation fails, the scaffolder falls back to the block's `default-content.json` rather than crashing.

## CLI

| Flag | What it does |
|------|--------------|
| `<name>` | Project directory name (relative to cwd) |
| `--blocks a,b,c` | Comma-separated block names |
| `--palette <name>` | One of the 32 palettes (see below) |
| `--prompt "..."` | Brand description — triggers AI copy when `ANTHROPIC_API_KEY` is set |
| `--yes`, `-y` | Non-interactive mode |

Env vars:

- `ANTHROPIC_API_KEY` — required for AI copy
- `FORNIX_ANTHROPIC_MODEL` — override the model (default: `claude-sonnet-4-6`; try `claude-haiku-4-5` for cheaper/faster runs)

## Blocks (42)

**Section blocks** — render visible content on the page

`hero-gradient` `hero-split` `hero-glass` `hero-video` `features-grid` `features-bento` `pricing-table` `pricing-comparison` `pricing-toggle` `testimonials-carousel` `testimonials-wall` `testimonials-chat` `faq-accordion` `faq-home` `cta-banner` `cta-newsletter` `contact-form` `contact-split` `footer-minimal` `footer-rich` `header-sticky` `header-transparent` `about-stats` `about-timeline` `about-values` `how-it-works` `logo-cloud` `stats-strip` `portfolio-grid` `callout`

**Layout blocks** — wrap your pages

`layout-marketing` `layout-docs` `layout-dashboard`

**Integration blocks** — backend wiring (Cloudflare-first)

`auth-better-auth` `db-d1` `payments-stripe` `email-resend` `analytics-cf`

**Feature blocks** — full-page features with their own content collections

`blog-mdx` `docs-collection`

**UI blocks**

`theme-switcher` `ai-og-images`

Every block passes a 6-check contract harness: valid manifest, files on disk, content slots declared, default content matches the slot schema, no hardcoded English text, palette tokens used consistently.

## Palettes (32)

Each palette declares 5 base colors; 4 more (`--color-surface`, `--color-muted`, `--color-border`, `--color-on-primary`) are derived automatically via `color-mix()` so blocks work the same on light and dark themes.

`midnight` `obsidian` `charcoal` `void` · `snow` `cotton` `pearl` `cream` · `neon-tokyo` `sunset-glow` `electric-violet` `cyber-punk` · `corporate-blue` `slate-modern` `executive` `trust` · `ocean-breeze` `forest` `glacier` `deep-sea` · `ember` `terracotta` `copper` `golden-hour` · `fintech-dark` `health-clean` `startup-bold` `luxury-gold` · `arctic` `desert-sand` `frost` `storm`

## i18n

Pass two or more `locales` and Fornix writes content under `src/content/sections/{locale}/{block}.json` and emits an `index.astro` per locale. Default goes to `/`; non-default goes to `/{locale}/`. When AI is enabled, each locale gets its own generated copy in one parallel call per (block × locale).

```bash
# Programmatic; CLI surface still pending
import { scaffoldProject } from "create-fornix";

await scaffoldProject({
  /* ...config */
  locales: ["en", "es", "ar"],
  defaultLocale: "en",
});
```

## Deployment

Static output (default):

```bash
npm run build
npx wrangler pages deploy dist
```

The generated project is a standard Astro site — any static host works (Cloudflare Pages, Netlify, Vercel static, S3). Server-rendered + Cloudflare adapter wiring is on the roadmap.

Pass `--deploy cloudflare` to the CLI to emit a `wrangler.json` alongside the project and print the exact deploy commands:

```bash
npx create-fornix my-site --deploy cloudflare --yes
# scaffolds + prints:
#   npm run build
#   npx wrangler pages deploy dist --project-name my-site
```

## Showcase site

The repo ships with a `pnpm showcase` script that scaffolds + builds a 12-block demo site via the published CLI binary — Fornix dogfooding itself.

```bash
pnpm showcase           # build to examples/showcase/dist
pnpm showcase:dev       # build + `astro preview`
pnpm showcase:deploy    # build + `wrangler pages deploy` (needs CF auth)
```

The output is regenerated on every run; `examples/showcase/` is gitignored.

## Project structure

```
my-site/
├── astro.config.mjs              # i18n config baked in
├── package.json                  # astro + block deps merged
├── tsconfig.json                 # extends astro/tsconfigs/strict
├── public/
│   └── styles/palettes/
│       └── _current.css          # the chosen palette
├── src/
│   ├── layouts/Layout.astro      # links palette CSS; sets lang from currentLocale
│   ├── pages/
│   │   ├── index.astro           # default locale
│   │   └── es/index.astro        # other locales (when multi-locale)
│   ├── components/sections/      # each selected block's .astro
│   ├── styles/sections/          # each selected block's .css
│   ├── content/
│   │   ├── sections/
│   │   │   └── en/<block>.json   # per-locale content
│   │   └── content.config.ts     # per-block Zod schemas merged
│   └── ...
```

## Development

```bash
git clone https://github.com/kamsqe/fornix.git
cd fornix
pnpm install
pnpm --filter fornix-registry build

# Three gates
pnpm --filter create-fornix typecheck
pnpm --filter create-fornix vitest run              # ~55 tests
pnpm --filter create-fornix exec playwright test    # 16 visual baselines
```

### Visual regression

Snapshots live next to each `*.visual.spec.ts`. Re-capture after a deliberate UI change with:

```bash
pnpm --filter create-fornix exec playwright test --update-snapshots
```

## What's not in v2 (yet)

- `fornix add <block>` / `fornix remove <block>` — manage blocks in an existing project
- `fornix deploy` — one-shot scaffold + Cloudflare Pages deploy
- MCP server — Claude Desktop / Cursor integration
- Runtime AI blocks (chatbot, semantic search) — deferred to v3 (separate UX scope)
- Recipe mode — `--recipe saas` etc. — coming back once the underlying spine is published
- Cloudflare server-rendered adapter wiring — currently static only

## License

MIT © [kamsqe](https://github.com/kamsqe)
