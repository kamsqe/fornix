# Scaffold Agent

Last verified: 2026-03-03

## Purpose

The scaffold pipeline turns a `ResolvedConfig` into a complete Astro project on disk. It is the core value proposition of Fornix — everything else (prompts, AI, registry) exists to produce a good config that this pipeline consumes.

## Architecture

```
ResolvedConfig → validate() → scaffold() → Post-Scaffold Hooks
                                  │
                ┌─────────────────┼──────────────────┐
                ▼                 ▼                   ▼
        Create structure    Place blocks      Generate configs
        (dirs, base files)  (copy from registry)  (astro.config, tailwind, etc.)
```

**Pipeline is a pure function.** `scaffold(config)` never reads user input, never checks environment variables, never prompts. All decisions are pre-made in `ResolvedConfig`.

**Post-scaffold hooks are separate.** `pnpm install`, `git init`, printing success messages — these happen AFTER `scaffold()` returns, in a separate post-scaffold step.

## ResolvedConfig Contract

```typescript
ResolvedConfig {
  projectName: string
  projectDir: string
  renderMode: 'static' | 'hybrid' | 'server'
  deployTarget: 'cloudflare' | 'vercel' | 'netlify' | 'static'
  database: 'none' | 'd1' | 'turso' | 'astro-db' | 'postgres'
  cssEngine: 'tailwind' | 'vanilla'
  packageManager: 'npm' | 'pnpm' | 'bun'
  blocks: Array<{ name: string, variant: string }>

  // i18n
  locales: string[]              // e.g. ['en', 'es'] — length >= 2 triggers i18n mode
  defaultLocale: string          // e.g. 'en'

  // Palette — either a pre-built name or custom colors
  palette: {
    preset?: string              // e.g. 'midnight', 'ocean-breeze', 'ember' (from PaletteRegistry)
    colors: { primary, secondary, accent, background, foreground }
  }
  themeSwitcher: boolean         // if true, scaffold the theme-switcher block

  content?: Record<string, Record<string, unknown>>
  createdWith: 'ai' | 'manual' | 'recipe' | 'mcp'
}
```

## Key Patterns

### File Generation

Config files (`astro.config.mjs`, `tailwind.config.ts`, `wrangler.toml`) are generated using **magicast** for AST manipulation — never string concatenation. This ensures valid JavaScript output regardless of option combinations.

### Block Placement Rules

| Block Type | Destination |
|-----------|-------------|
| `section` | `src/components/sections/{name}.astro` |
| `integration` | `src/lib/`, `src/middleware/`, `src/pages/api/` |
| `feature` | `src/pages/`, `src/content/`, `src/layouts/` |
| `layout` | `src/layouts/` |

Each block's `block.json` has a `files` array with explicit `source → destination` mappings. The placer follows these, never guesses.

### Dependency Resolution

Blocks declare `requires` and `conflicts` in `block.json`. The resolver:
1. Builds a dependency graph
2. Detects circular dependencies (error)
3. Detects conflicts (error)
4. Topologically sorts for correct ordering
5. Auto-includes transitive dependencies

### Content Collection Wiring

When a block adds a content collection, its schema is merged into `src/content/config.ts`. The merge is additive — never overwrites existing collections.

**i18n content wiring:** When `locales.length >= 2`, content files are keyed by locale. For each block's content slot, the scaffold generates one content file per locale:
- Single locale: `src/content/sections/hero.json`
- Multi-locale: `src/content/en/sections/hero.json`, `src/content/es/sections/hero.json`

### Generated Project Structure

```
{project}/
├── src/
│   ├── components/sections/    ← section blocks
│   ├── content/                ← JSON/MD content (AI-generated or default)
│   │   ├── config/             ← site.json, nav.json
│   │   ├── sections/           ← hero.json, features.json, ...
│   │   ├── blog/               ← if blog block installed
│   │   ├── en/                 ← if i18n: locale-specific content
│   │   │   ├── sections/       ←   hero.json, features.json, ...
│   │   │   └── config/         ←   site.json, nav.json
│   │   └── es/                 ← additional locale
│   │       └── ...
│   ├── i18n/                   ← if i18n: translation utilities
│   │   └── utils.ts            ←   getLocale(), t() helper
│   ├── layouts/
│   ├── lib/                    ← integration block utilities
│   ├── middleware/              ← if auth/SSR blocks
│   ├── pages/
│   │   ├── api/                ← if server-side blocks
│   │   └── [locale]/           ← if i18n: locale-prefixed routes
│   └── styles/
│       ├── global.css
│       └── palettes/           ← if themeSwitcher: CSS palette files
│           ├── _current.css    ←   active palette (CSS custom properties)
│           ├── midnight.css
│           ├── ocean-breeze.css
│           └── ...
├── astro.config.mjs            ← includes i18n config if locales >= 2
├── tailwind.config.ts              ← if cssEngine === 'tailwind'
├── package.json
├── tsconfig.json
├── wrangler.toml               ← if cloudflare deploy target
├── fornix.json                 ← ProjectManifest (CLI tracking only)
├── CLAUDE.md                   ← auto-generated project context
└── .cursor/rules/              ← auto-generated for Cursor
```

### Palette System

Palettes are applied as CSS custom properties on `:root`. When `themeSwitcher` is true:
- All pre-built palettes are included as individual CSS files in `src/styles/palettes/`
- A `theme-switcher` block is auto-added (small client-side script + UI toggle)
- Palettes swap by replacing CSS custom properties at runtime — no rebuild needed
- User's choice is persisted in `localStorage`

## Anti-Patterns

- **Never** read user input inside `scaffold()`.
- **Never** import from one block into another block's files.
- **Never** generate config files via string templates — use magicast.
- **Never** hardcode dependency versions — read from block manifests.
- **Never** hardcode visible text in `.astro` components — always source from content collections (especially critical when i18n is enabled).

## Test Strategy

- **Unit:** dependency resolver, config validation, template rendering
- **Integration (memfs):** scaffold output file verification (fast, no disk I/O)
- **Integration (real fs):** `astro check` on generated projects
- **Snapshot:** file tree snapshots catch accidental additions/removals
