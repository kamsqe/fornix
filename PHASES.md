# Fornix — Vibecoding Phase Breakdown

> Each phase is a single vibecoding session (or part of one). Phases are ordered by dependency — later phases build on what earlier ones produce. **Do not skip ahead.** Each phase has verification steps that MUST pass before moving on.

---

## How to Use This Document

1. **Start a session** → attach `.context/AGENTS.md` + the relevant domain agent
2. **Pick the next unchecked phase** → tell the agent "implement phase N"
3. **Run the verification** → every phase has exact commands/checks
4. **Check it off** → mark `[x]` when verified
5. **Commit** → `git add -A && git commit -m "feat(scope): phase N description"`

---

## Tier 1 — Schemas & Types (Foundation)

Everything depends on these. They define the contracts that every other module consumes.

---

### Phase 1: `BlockManifest` Schema
> **Package:** `fornix-registry` · **Agent:** `blocks-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

Build the Zod schema that defines what a block IS.

**What to build:**
- `packages/fornix-registry/src/schemas/block-manifest.ts`
- Export `BlockManifestSchema` (Zod) and `BlockManifest` (type)
- All fields from `blocks-agent.md`: `schemaVersion`, `name`, `version`, `type`, `description`, `category`, `tags`, `dependencies`, `requires`, `conflicts`, `requiredMode`, `envVars`, `variants`, `slots`, `files`, `ai` (optional)
- Also create `vitest.config.ts` and `tsup.config.ts` for `fornix-registry` if not already present

**Verification:**
- [ ] `pnpm typecheck` passes (0 errors)
- [ ] Unit test: valid manifest parses successfully
- [ ] Unit test: manifest with missing `name` fails
- [ ] Unit test: manifest with invalid `type` (not section/integration/feature/layout) fails
- [ ] Unit test: `name` rejects uppercase and special chars (regex `^[a-z][a-z0-9-]*$`)
- [ ] Unit test: `files` array validates `source` and `destination` fields
- [ ] Run: `pnpm --filter fornix-registry test:unit`

---

### Phase 2: `PaletteRegistry` Schema
> **Package:** `fornix-registry` · **Agent:** `registry-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/registry-agent.md`

Define the schema for pre-built palettes and create the first batch.

**What to build:**
- `packages/fornix-registry/src/schemas/palette.ts`
- Export `PaletteSchema` and `Palette` type: `{ name, displayName, category, mode: 'light'|'dark', colors: { primary, secondary, accent, background, foreground } }`
- Export `PaletteRegistrySchema` — array of palettes
- `packages/fornix-registry/palettes/` — JSON files for 30+ palettes across 8 categories (see `registry-agent.md`)

**Verification:**
- [ ] `pnpm typecheck` passes
- [ ] Unit test: valid palette parses
- [ ] Unit test: palette with missing `primary` color fails
- [ ] Unit test: palette `name` follows kebab-case
- [ ] Unit test: load all palette JSON files and validate each against `PaletteSchema`
- [ ] Unit test: no duplicate palette names
- [ ] Unit test: every category from `registry-agent.md` has at least 3 palettes
- [ ] Run: `pnpm --filter fornix-registry test:unit`

---

### Phase 3: `ResolvedConfig` Schema
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Define THE contract between user input and the scaffold pipeline.

**What to build:**
- `packages/create-fornix/src/schemas/config.ts`
- Export `ResolvedConfigSchema` and `ResolvedConfig` type
- All fields from `scaffold-agent.md`: `projectName`, `projectDir`, `renderMode`, `deployTarget`, `database`, `cssEngine`, `packageManager`, `blocks`, `locales`, `defaultLocale`, `palette` (preset + colors), `themeSwitcher`, `content`, `createdWith`

**Verification:**
- [ ] `pnpm typecheck` passes
- [ ] Unit test: valid config parses (static, cloudflare, 2 blocks, single locale)
- [ ] Unit test: valid config parses (server, cloudflare, auth+db blocks, 2 locales, palette preset)
- [ ] Unit test: invalid `renderMode` value fails
- [ ] Unit test: `locales` array with 0 items defaults to `['en']`
- [ ] Unit test: `defaultLocale` must be in `locales` array
- [ ] Unit test: `palette.preset` is optional, but `palette.colors` is required
- [ ] Unit test: `themeSwitcher` defaults to `false`
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 4: `ProjectManifest` Schema
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Define the tracking file (`fornix.json`) that the CLI writes into generated projects.

**What to build:**
- `packages/create-fornix/src/schemas/project-manifest.ts`
- Export `ProjectManifestSchema` and `ProjectManifest` type
- Fields: `$schema`, `version`, `createdAt`, `createdWith`, `renderMode`, `deployTarget`, `database`, `locales`, `defaultLocale`, `palette`, `themeSwitcher`, `blocks` (array with name, version, variant, installedAt)

**Verification:**
- [ ] `pnpm typecheck` passes
- [ ] Unit test: valid manifest parses
- [ ] Unit test: `blocks` array items validate `installedAt` as ISO datetime
- [ ] Unit test: round-trip — create → serialize to JSON → parse back → matches
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 5: `IntentSchema` + AI Types
> **Package:** `create-fornix` · **Agent:** `ai-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md`

Define AI contracts even though AI is built later. Types must exist from Day 1.

**What to build:**
- `packages/create-fornix/src/ai/schemas.ts` — `IntentSchema`, `Intent` type
- `packages/create-fornix/src/ai/provider.ts` — `AIProvider` interface (generate + stream)
- `packages/create-fornix/src/ai/types.ts` — `AnalysisResult`, `Question`, `Answer`, `ProposedConfig`, `BrandContext`, `ContentMap` types
- All fields from `ai-agent.md` IntentSchema including `languages`, `palettePreference`, `wantsThemeSwitcher`

**Verification:**
- [ ] `pnpm typecheck` passes
- [ ] Unit test: valid fintech landing page intent parses
- [ ] Unit test: valid SaaS dashboard intent parses (needsAuth, needsDashboard = true)
- [ ] Unit test: `languages` defaults to empty array
- [ ] Unit test: `overallConfidence` must be 0–1
- [ ] Unit test: `recommendedBlocks[].confidence` must be 0–1
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 6: `Result<T, E>` Utility + Error Types
> **Package:** `create-fornix` · **Agent:** `AGENTS.md` (principle 10)
> **Attach:** `.context/AGENTS.md`

Establish the error handling pattern used everywhere.

**What to build:**
- `packages/create-fornix/src/utils/result.ts` — `Result<T, E>`, `ok()`, `err()`, `isOk()`, `isErr()`, `unwrap()` helpers
- `packages/create-fornix/src/errors.ts` — typed error enums: `SchemaValidationError`, `DependencyConflictError`, `CircularDependencyError`, `BlockNotFoundError`, `ProviderError`

**Verification:**
- [ ] `pnpm typecheck` passes
- [ ] Unit test: `ok(42)` returns `{ ok: true, value: 42 }`
- [ ] Unit test: `err('fail')` returns `{ ok: false, error: 'fail' }`
- [ ] Unit test: `unwrap(ok(42))` returns `42`
- [ ] Unit test: `unwrap(err('fail'))` throws
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

## Tier 2 — Scaffold Pipeline (Core Value)

The scaffold pipeline is the product. Given a config, produce a project.

---

### Phase 7: Dependency Resolver
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Pure function: given selected blocks + manifest data, resolve dependencies and detect problems.

**What to build:**
- `packages/create-fornix/src/scaffold/dependency-resolver.ts`
- `resolveDependencies(selected: string[], manifests: Record<string, BlockManifest>): Result<string[], DependencyError>`
- Topological sort, auto-include transitive deps, detect circular deps, detect conflicts

**Verification:**
- [ ] Unit test: flat graph (no deps) → returns same order
- [ ] Unit test: A requires B → B ordered before A
- [ ] Unit test: transitive deps (A→B→C) → all 3 included, C first
- [ ] Unit test: circular dep (A→B→A) → returns `CircularDependencyError`
- [ ] Unit test: conflict (A conflicts B, both selected) → returns `DependencyConflictError`
- [ ] Unit test: missing block (A requires X, X not in manifests) → returns `BlockNotFoundError`
- [ ] Unit test: duplicate selections deduped
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 8: Config Validator
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Validate that a `ResolvedConfig` is internally consistent beyond schema validation.

**What to build:**
- `packages/create-fornix/src/scaffold/config-validator.ts`
- `validateConfig(config: ResolvedConfig, manifests: Record<string, BlockManifest>): Result<ResolvedConfig, ValidationError[]>`
- Check: blocks with `requiredMode: 'server'` don't appear in static config
- Check: `database !== 'none'` requires `renderMode !== 'static'`
- Check: all blocks exist in manifests
- Check: dependency resolution passes
- Check: `defaultLocale` in `locales`

**Verification:**
- [ ] Unit test: valid static config passes
- [ ] Unit test: valid server+auth config passes
- [ ] Unit test: auth block in static mode → error "auth-better-auth requires server rendering"
- [ ] Unit test: database `d1` with static mode → error
- [ ] Unit test: block not in manifests → error
- [ ] Unit test: `defaultLocale: 'es'` with `locales: ['en']` → error
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 9: Project Structure Generator
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Create the base Astro project directory structure (no blocks yet).

**What to build:**
- `packages/create-fornix/src/scaffold/structure-generator.ts`
- `generateStructure(config: ResolvedConfig): FileMap` (returns a map of `path → content`)
- Generate: `package.json`, `tsconfig.json`, `.gitignore`, base `src/` dirs
- Accept a filesystem abstraction (for memfs in tests)

**Verification:**
- [ ] Integration test (memfs): static config → creates `src/`, `src/pages/index.astro`, `package.json`, `tsconfig.json`
- [ ] Integration test (memfs): `package.json` has `astro` dependency
- [ ] Integration test (memfs): `package.json` name matches `projectName`
- [ ] Integration test (memfs): no `wrangler.toml` when `deployTarget !== 'cloudflare'`
- [ ] Integration test (memfs): `wrangler.toml` exists when `deployTarget === 'cloudflare'`
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 10: Astro Config Generator (magicast)
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Generate `astro.config.mjs` from `ResolvedConfig` using magicast for safe AST manipulation.

**What to build:**
- `packages/create-fornix/src/scaffold/config-generators/astro-config.ts`
- `generateAstroConfig(config: ResolvedConfig): string`
- Set `output` based on `renderMode`
- Add correct adapter import (`@astrojs/cloudflare`, `@astrojs/vercel`, etc.)
- Add `i18n` config when `locales.length >= 2`: `{ defaultLocale, locales, routing: { prefixDefaultLocale: false } }`

**Verification:**
- [ ] Unit test: static config → `output: 'static'`
- [ ] Unit test: server config → `output: 'server'`
- [ ] Unit test: hybrid config → `output: 'hybrid'`
- [ ] Unit test: cloudflare target → imports `@astrojs/cloudflare`
- [ ] Unit test: vercel target → imports `@astrojs/vercel`
- [ ] Unit test: single locale → no `i18n` key in config
- [ ] Unit test: 2 locales → `i18n.defaultLocale` and `i18n.locales` are set
- [ ] Unit test: output is valid JavaScript (parseable by acorn or similar)
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 11: Tailwind + Palette Config Generator
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md` + `registry-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md` + `.context/agents/registry-agent.md`

Generate Tailwind config and palette CSS custom properties.

**What to build:**
- `packages/create-fornix/src/scaffold/config-generators/tailwind-config.ts`
- `packages/create-fornix/src/scaffold/config-generators/palette-css.ts`
- `generatePaletteCSS(palette: Palette, allPalettes?: Palette[]): string` — produces `:root { --color-primary: ...; }` CSS
- When `cssEngine = 'vanilla'`, skip Tailwind config entirely
- When `themeSwitcher = true`, generate individual palette CSS files + a switcher script

**Verification:**
- [ ] Unit test: generates valid CSS custom properties for primary/secondary/accent/background/foreground
- [ ] Unit test: palette preset name resolves to correct colors from registry
- [ ] Unit test: custom colors (no preset) work
- [ ] Unit test: `themeSwitcher = true` → generates multiple palette CSS files
- [ ] Unit test: `themeSwitcher = false` → generates only `_current.css`
- [ ] Unit test: `cssEngine = 'vanilla'` → no `tailwind.config.ts` generated
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 12: Block Placer
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Copy block files into the correct project locations.

**What to build:**
- `packages/create-fornix/src/scaffold/block-placer.ts`
- `placeBlocks(blocks: BlockManifest[], projectDir: string, fs: FileSystem): FileMap`
- Read each block's `files` array, map `source → destination`
- Handle `condition` field (e.g., skip files when `renderMode === 'static'`)

**Verification:**
- [ ] Integration test (memfs): section block → files placed in `src/components/sections/`
- [ ] Integration test (memfs): integration block → files placed in `src/lib/` and/or `src/pages/api/`
- [ ] Integration test (memfs): block with condition `renderMode !== 'static'` + static config → file skipped
- [ ] Integration test (memfs): block with condition + server config → file included
- [ ] Integration test (memfs): no files from unselected blocks leak in
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 13: Content Collection Wiring
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Generate `src/content/config.ts` and wire block content schemas. Handle i18n content structure.

**What to build:**
- `packages/create-fornix/src/scaffold/content-wiring.ts`
- Merge block schemas into a single `src/content/config.ts`
- Single locale: `src/content/sections/hero.json`
- Multi-locale: `src/content/{locale}/sections/hero.json`
- Place default content from blocks

**Verification:**
- [ ] Integration test (memfs): 1 block with content → `src/content/config.ts` has its collection
- [ ] Integration test (memfs): 2 blocks with content → both collections merged
- [ ] Integration test (memfs): single locale → content in `src/content/sections/`
- [ ] Integration test (memfs): 2 locales → content in `src/content/en/sections/` and `src/content/es/sections/`
- [ ] Integration test (memfs): default content files are valid JSON
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 14: i18n Wiring
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

When `locales.length >= 2`, scaffold the i18n infrastructure.

**What to build:**
- `packages/create-fornix/src/scaffold/i18n-wiring.ts`
- Generate `src/i18n/utils.ts` — `getLocale()`, `t()` helper
- Generate locale-prefixed page routes (`src/pages/[locale]/`)
- Wire `astro.config.mjs` i18n section (already in Phase 10, this adds routing integration)

**Verification:**
- [ ] Integration test (memfs): single locale → no `src/i18n/` dir
- [ ] Integration test (memfs): 2 locales → `src/i18n/utils.ts` exists
- [ ] Integration test (memfs): `src/i18n/utils.ts` exports `getLocale` and `t`
- [ ] Integration test (memfs): `src/pages/[locale]/` directory exists
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 15: Full Scaffold Pipeline Assembly
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md`

Wire phases 7–14 into the single `scaffold()` function.

**What to build:**
- `packages/create-fornix/src/scaffold/pipeline.ts`
- `scaffold(config: ResolvedConfig, manifests: Record<string, BlockManifest>, fs: FileSystem): Result<ScaffoldResult, Error>`
- Calls: validate → resolve deps → generate structure → generate configs → place blocks → wire content → wire i18n → generate `.env.example` (from blocks' `envVars`) → write `fornix.json`

**Verification:**
- [ ] Integration test (memfs): static + cloudflare + 2 blocks → complete project structure
- [ ] Integration test (memfs): server + cloudflare + auth + db → includes wrangler.toml, drizzle config
- [ ] Integration test (memfs): 2 locales → i18n structure present
- [ ] Integration test (memfs): themeSwitcher → palette CSS files present
- [ ] Integration test (memfs): `fornix.json` written and valid
- [ ] Integration test (memfs): blocks with `envVars` → `.env.example` lists all required vars
- [ ] Snapshot test: file tree matches snapshot for each config combination
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 16: Real Filesystem + `astro check` Validation
> **Package:** `create-fornix` · **Agent:** `testing-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/testing-agent.md` + `.context/agents/scaffold-agent.md`

Prove the scaffold output is a real, valid Astro project.

**What to build:**
- `tests/integration/scaffold-real-fs.test.ts`
- Scaffold to temp directory, `pnpm install`, `astro check`
- Test at least 3 configs: static, hybrid+i18n, server+auth

**Verification:**
- [ ] Integration test (real fs): static project → `astro check` exits 0
- [ ] Integration test (real fs): hybrid + 2 locales → `astro check` exits 0
- [ ] Integration test (real fs): server + auth blocks → `astro check` exits 0
- [ ] Run: `pnpm --filter create-fornix test:integration` (these are slower, tag them appropriately)

---

## Tier 3 — CLI Framework

The entry point for users. Connects user input to the scaffold pipeline.

---

### Phase 17: citty Command Skeleton
> **Package:** `create-fornix` · **Agent:** `cli-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

Set up the CLI framework with all commands defined (handlers empty).

**What to build:**
- `packages/create-fornix/src/cli/index.ts` — main citty entry, define all commands
- `packages/create-fornix/src/cli/commands/create.ts` — the `create-fornix [dir]` command
- `packages/create-fornix/src/cli/commands/add.ts`
- `packages/create-fornix/src/cli/commands/remove.ts`
- `packages/create-fornix/src/cli/commands/list.ts`
- `packages/create-fornix/src/cli/commands/status.ts`
- Wire into `src/index.ts` as the real entry point

**Verification:**
- [ ] `pnpm --filter create-fornix build` succeeds
- [ ] `node packages/create-fornix/dist/index.mjs --help` prints help text with all commands
- [ ] `node packages/create-fornix/dist/index.mjs create --help` shows create flags
- [ ] Run each command with `--help` and verify it doesn't crash

---

### Phase 18: Flag-Driven Create (Non-Interactive)
> **Package:** `create-fornix` · **Agent:** `cli-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

Make `create-fornix` work with flags only (no prompts), wired to the scaffold pipeline.

**What to build:**
- Parse flags in `create.ts`: `--render`, `--deploy`, `--blocks`, `--locales`, `--palette`, `--theme-switcher`, `--yes`
- Build `ResolvedConfig` from flags
- Call `scaffold()` with hardcoded fixture manifests (real registry comes later)
- Post-scaffold: print success message

**Verification:**
- [ ] E2E test: `node dist/index.mjs ./tmp-test --render static --deploy cloudflare --blocks hero-gradient --yes` → exits 0
- [ ] E2E test: `--locales en,es` → i18n structure in output
- [ ] E2E test: `--palette midnight` → palette CSS in output
- [ ] E2E test: `--theme-switcher` → multiple palette CSS files in output
- [ ] E2E test: output directory contains `package.json`, `astro.config.mjs`, `fornix.json`
- [ ] Run: `pnpm --filter create-fornix test:e2e`

---

### Phase 19: Interactive Prompts (Manual Mode)
> **Package:** `create-fornix` · **Agent:** `cli-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

Build the @clack/prompts interactive flow.

**What to build:**
- `packages/create-fornix/src/prompts/manual-flow.ts`
- Prompt sequence: project name → render mode → deploy target → block selection (categorized) → locale selection → palette selection (browse pre-built) → theme switcher toggle → confirmation summary
- Output: `ResolvedConfig`

**Verification:**
- [ ] `pnpm --filter create-fornix build` succeeds
- [ ] Manual test: run `node dist/index.mjs ./tmp-test --manual` and walk through all prompts
- [ ] Manual test: palette selection shows palette names grouped by category
- [ ] Manual test: locale prompt appears and accepts comma-separated codes
- [ ] Manual test: confirmation summary shows all selections (render, deploy, blocks, locales, palette, theme switcher)
- [ ] Manual test: accepting → project created successfully

---

### Phase 20: Post-Scaffold Hooks
> **Package:** `create-fornix` · **Agent:** `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/scaffold-agent.md` + `.context/agents/cli-agent.md`

Run actions after scaffold: install deps, git init, print next steps.

**What to build:**
- `packages/create-fornix/src/scaffold/post-scaffold.ts`
- Detect package manager, run install
- `git init` + initial commit
- Print success box with next steps (`cd`, `pnpm dev`, `fornix add`)
- Generate basic `CLAUDE.md` with project-specific context (full version in Phase 47)

**Verification:**
- [ ] E2E test: after scaffold, `node_modules` exists (deps installed)
- [ ] E2E test: `.git` directory exists
- [ ] E2E test: `CLAUDE.md` exists and contains block names
- [ ] E2E test: stdout contains "cd" and "dev" instructions
- [ ] Run: `pnpm --filter create-fornix test:e2e`

---

## Tier 4 — Fixture Blocks

Create real, minimal blocks to make the scaffold produce actual pages.

---

### Phase 21: First Section Block — `hero-gradient`
> **Package:** `fornix-blocks` · **Agent:** `blocks-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

Build the first real block end-to-end.

**What to build:**
- `packages/fornix-blocks/blocks/hero-gradient/block.json` (full manifest with ai metadata)
- `packages/fornix-blocks/blocks/hero-gradient/hero-gradient.astro` (component reading from content collection)
- `packages/fornix-blocks/blocks/hero-gradient/hero-gradient.css`
- `packages/fornix-blocks/blocks/hero-gradient/schema.ts` (content collection schema)
- `packages/fornix-blocks/blocks/hero-gradient/default-content.json`
- **Zero hardcoded text** in the `.astro` file — all text from content collection

**Verification:**
- [ ] Unit test: `block.json` parses against `BlockManifestSchema`
- [ ] Integration test: scaffold with this block → `astro check` passes
- [ ] Manual test: `pnpm dev` in generated project → hero section renders with content from JSON
- [ ] Verify: no inline text strings in `.astro` file (grep for hardcoded text)

---

### Phase 22: `footer-minimal` + `features-grid` Blocks
> **Package:** `fornix-blocks` · **Agent:** `blocks-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

Add 2 more section blocks to test combinations.

**What to build:**
- Full block directories for `footer-minimal` and `features-grid`
- Same structure as Phase 21: manifest, component, css, schema, default content
- All text from content collections

**Verification:**
- [ ] Unit test: both manifests parse
- [ ] Integration test: scaffold with all 3 blocks → `astro check` passes
- [ ] Integration test: blocks don't conflict (no CSS collisions, no import collisions)
- [ ] Snapshot test: file tree with 3 blocks matches snapshot

---

### Phase 23: `theme-switcher` Block
> **Package:** `fornix-blocks` · **Agent:** `blocks-agent.md` + `registry-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md` + `.context/agents/registry-agent.md`

Build the runtime palette switcher component.

**What to build:**
- `packages/fornix-blocks/blocks/theme-switcher/block.json`
- `packages/fornix-blocks/blocks/theme-switcher/theme-switcher.astro` — client-side island
- Client-side script: reads available palettes from CSS files, swaps `<link>` or CSS class, persists to `localStorage`
- Toggle UI (dropdown or pill selector)

**Verification:**
- [ ] Unit test: manifest parses
- [ ] Integration test: scaffold with `themeSwitcher: true` → theme-switcher block auto-included
- [ ] Integration test: multiple palette CSS files present in `src/styles/palettes/`
- [ ] Manual test: run `pnpm dev`, click theme switcher → palettes swap visually
- [ ] Manual test: refresh page → last selected palette persists

---

### Phase 24: First Integration Block — `db-d1`
> **Package:** `fornix-blocks` · **Agent:** `blocks-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

Build a block that adds serverside infrastructure.

**What to build:**
- `packages/fornix-blocks/blocks/db-d1/block.json` — `requiredMode: 'server'`, deps on drizzle-orm
- Drizzle config, migration stub, wrangler.toml d1_databases section
- `envVars` declaration

**Verification:**
- [ ] Unit test: manifest parses, `requiredMode` is `'server'`
- [ ] Integration test: scaffold with db-d1 + server mode → drizzle config exists, wrangler.toml has d1_databases
- [ ] Integration test: scaffold with db-d1 + static mode → config validator rejects
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 25: `auth-better-auth` Block
> **Package:** `fornix-blocks` · **Agent:** `blocks-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

Auth block that depends on the db block.

**What to build:**
- `packages/fornix-blocks/blocks/auth-better-auth/block.json` — `requires: ['db-d1']`, `requiredMode: 'server'`
- Auth middleware, login/signup pages, session handling

**Verification:**
- [ ] Unit test: manifest `requires` includes `db-d1`
- [ ] Integration test: selecting auth auto-includes db-d1 via dependency resolver
- [ ] Integration test: scaffold with auth → middleware file placed, auth pages exist
- [ ] Integration test: scaffold with auth + static mode → rejected by validator
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

## Tier 5 — Block Registry

Blocks move from local to remote.

---

### Phase 26: Registry Index Builder
> **Package:** `fornix-registry` · **Agent:** `registry-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/registry-agent.md`

Script that reads all blocks and produces a `registry.json` index.

**What to build:**
- `packages/fornix-registry/scripts/build-registry.ts`
- Scan all block dirs, read `block.json`, produce `registry.json` with all manifests
- Include palette registry in the output

**Verification:**
- [ ] Run script → `registry.json` created
- [ ] Unit test: output parses as valid JSON
- [ ] Unit test: all blocks from `furnix-blocks/blocks/` are included
- [ ] Unit test: all palettes from `fornix-registry/palettes/` are included
- [ ] Unit test: no duplicate block or palette names

---

### Phase 27: Block Fetcher (giget)
> **Package:** `create-fornix` · **Agent:** `registry-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/registry-agent.md`

Fetch blocks from a GitHub registry repo.

**What to build:**
- `packages/create-fornix/src/registry/block-fetcher.ts`
- Use giget to download individual block directories
- Local cache in `~/.cache/fornix/blocks/`
- Fallback: if offline, use cache

**Verification:**
- [ ] Integration test (mock HTTP): fetches block dir and returns manifest + files
- [ ] Integration test: cache hit skips network call
- [ ] Integration test: offline + cache miss → returns error (not crash)
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 28: `fornix list` Command
> **Package:** `create-fornix` · **Agent:** `cli-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

Display available blocks from the registry.

**What to build:**
- Wire `list` command handler
- Fetch registry.json, display blocks grouped by type and category
- Show: name, description, type, tags

**Verification:**
- [ ] E2E test: `fornix list` → outputs block names
- [ ] E2E test: `fornix list --type section` → only section blocks
- [ ] Manual test: output is readable and well-formatted

---

### Phase 29: `fornix add` Command
> **Package:** `create-fornix` · **Agent:** `cli-agent.md` + `scaffold-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md` + `.context/agents/scaffold-agent.md`

Add a block to an existing project.

**What to build:**
- Wire `add` command handler
- Read `fornix.json` → fetch block → resolve deps → place files → merge content → update `fornix.json`

**Verification:**
- [ ] E2E test: create project → `fornix add pricing-table` → block files present
- [ ] E2E test: adding block with dependency auto-adds the dependency
- [ ] E2E test: `fornix.json` updated with new block
- [ ] E2E test: `astro check` still passes after add
- [ ] E2E test: adding already-installed block → shows "already installed" message

---

### Phase 30: `fornix remove` Command
> **Package:** `create-fornix` · **Agent:** `cli-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

Remove a block from an existing project.

**What to build:**
- Wire `remove` command handler
- Remove files, clean unused deps, warn about dependent blocks, update `fornix.json`

**Verification:**
- [ ] E2E test: add block then remove it → files gone
- [ ] E2E test: removing a block that others depend on → warning message
- [ ] E2E test: `fornix.json` updated to remove block
- [ ] E2E test: `astro check` still passes after remove

---

### Phase 31: `fornix status` Command
> **Package:** `create-fornix` · **Agent:** `cli-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

Show what's installed in the current project.

**What to build:**
- Wire `status` command handler
- Read `fornix.json`, display installed blocks, render mode, deploy target, locales, palette

**Verification:**
- [ ] E2E test: in a fornix project → outputs block list, render mode, deploy target
- [ ] E2E test: outside a fornix project → helpful error message
- [ ] Manual test: output includes locale info and palette name

---

## Tier 6 — AI Layer

Plug in AI to make the primary interface work.

---

### Phase 32: Rules Engine
> **Package:** `create-fornix` · **Agent:** `ai-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md`

Deterministic rules that don't need AI. Runs on the `Intent` object.

**What to build:**
- `packages/create-fornix/src/ai/rules.ts`
- All rules from `ai-agent.md`: auth→SSR, payments→hybrid, blog→static, cloudflare→analytics, languages→i18n, themeSwitcher→block
- `applyRules(intent: Intent, mutableConfig: MutableConfig): void`

**Verification:**
- [ ] Unit test: auth intent → renderMode `server`, auth + db blocks added
- [ ] Unit test: payments intent → renderMode `hybrid` (if was static), stripe block added
- [ ] Unit test: blog intent (no dynamic) → renderMode `static`, blog-mdx added
- [ ] Unit test: cloudflare target → analytics-cf added
- [ ] Unit test: `languages: ['en', 'es']` → locales set, defaultLocale `'en'`
- [ ] Unit test: `wantsThemeSwitcher: true` → themeSwitcher set, theme-switcher block added
- [ ] Unit test: rules are idempotent (applying twice = same result)
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 33: System Prompt Builder
> **Package:** `create-fornix` · **Agent:** `ai-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md`

Build the dynamic system prompt from the block registry.

**What to build:**
- `packages/create-fornix/src/ai/prompt-builder.ts`
- `buildSystemPrompt(registry: BlockRegistry): string`
- Include all blocks with name, description, category, tags, ai.whenToUse, ai.whenNotToUse, ai.pairsWith, ai.contentSlots
- Include palette names and categories
- Include constraints (renders modes, conflicts, etc.)

**Verification:**
- [ ] Unit test: prompt contains all block names from fixture registry
- [ ] Unit test: prompt contains palette names
- [ ] Unit test: prompt contains constraint rules
- [ ] Snapshot test: prompt matches snapshot (catches accidental changes)
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 34: Mock AI Provider
> **Package:** `create-fornix` · **Agent:** `ai-agent.md` + `testing-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md` + `.context/agents/testing-agent.md`

Create a mock provider for testing the AI flow without real API calls.

**What to build:**
- `packages/create-fornix/src/ai/providers/mock-provider.ts`
- `tests/fixtures/ai-responses/` — 5 fixture responses: fintech-landing, personal-blog, saas-dashboard, multilingual-agency, portfolio
- Mock provider matches prompt keywords to fixture responses

**Verification:**
- [ ] Unit test: mock provider returns fixture response for "fintech" prompt
- [ ] Unit test: mock provider throws for unknown prompt
- [ ] Unit test: fixture responses all parse against `IntentSchema`
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 35: Provider Abstraction + Real Providers
> **Package:** `create-fornix` · **Agent:** `ai-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md`

Implement the provider resolution and at least 2 real providers.

**What to build:**
- `packages/create-fornix/src/ai/providers/openai-provider.ts` — via Vercel AI SDK
- `packages/create-fornix/src/ai/providers/ollama-provider.ts` — local Ollama
- `packages/create-fornix/src/ai/providers/cloudflare-provider.ts` — Workers AI (free tier for CF deploys)
- `packages/create-fornix/src/ai/resolve-provider.ts` — detection + resolution order
- Install: `ai`, `@ai-sdk/openai` as dependencies

**Verification:**
- [ ] Unit test: `resolveProvider()` returns null when no keys/Ollama
- [ ] Unit test: `resolveProvider()` prefers Ollama when running
- [ ] Unit test: `resolveProvider({ provider: 'openai' })` returns OpenAI provider
- [ ] Integration test (optional, `AI_TEST=true`): OpenAI provider returns valid intent
- [ ] Run: `pnpm --filter create-fornix test:unit`

---

### Phase 36: AI Conversation Loop
> **Package:** `create-fornix` · **Agent:** `ai-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md`

The full AI pipeline: analyze → clarify → resolve → content → palette.

**What to build:**
- `packages/create-fornix/src/ai/conversation.ts`
- `runAIConversation(engine, registry, description): ResolvedConfig`
- Clarification loop (max 3 rounds) with @clack/prompts for follow-up questions
- Content generation for selected blocks
- Palette selection (from pre-built or AI-generated)

**Verification:**
- [ ] Integration test (mock provider): fintech description → produces valid ResolvedConfig
- [ ] Integration test (mock provider): ambiguous description → generates follow-up questions
- [ ] Integration test (mock provider): multilingual description → locales populated
- [ ] Integration test (mock provider): content generated for all selected blocks
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

### Phase 37: AI Mode in Create Command
> **Package:** `create-fornix` · **Agent:** `cli-agent.md` + `ai-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md` + `.context/agents/ai-agent.md`

Wire the AI conversation into the `create` command as the default path.

**What to build:**
- Update `create.ts`: when no `--manual` flag, run AI mode
- Description prompt via @clack/prompts → AI conversation → confirmation → scaffold
- No-provider fallback: show setup guide, offer `--manual`

**Verification:**
- [ ] E2E test (mock provider): `create-fornix ./tmp --yes` → AI mode runs, project scaffolded
- [ ] E2E test: `create-fornix ./tmp --manual --yes` → manual mode, no AI
- [ ] Manual test: run without API keys → shows helpful no-provider message
- [ ] Manual test: run with `OPENAI_API_KEY` set → AI conversation works

---

### Phase 38: Multi-Locale Content Generation
> **Package:** `create-fornix` · **Agent:** `ai-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/ai-agent.md`

AI generates content for ALL locales when i18n is enabled.

**What to build:**
- Update `engine.generateContent()` to accept locales
- For each locale, generate culturally appropriate content
- Write content to locale-specific paths

**Verification:**
- [ ] Integration test (mock provider): 2 locales → content files exist for both
- [ ] Integration test: content files parse as valid JSON matching block content schemas
- [ ] Integration test: locale-specific content is different (not just duplicated)
- [ ] Run: `pnpm --filter create-fornix test:integration`

---

## Tier 7 — Real Block Library

Build the full block collection.

---

### Phase 39: Section Blocks Batch 1 (5 blocks)
> `hero-split`, `hero-video`, `pricing-table`, `cta-banner`, `footer-rich`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

**Verification per block:**
- [ ] Manifest parses
- [ ] Scaffold alone → `astro check` passes
- [ ] Scaffold with companion blocks → no conflicts
- [ ] Zero hardcoded text (verified by grep)

---

### Phase 40: Section Blocks Batch 2 (5 blocks)
> `features-bento`, `pricing-comparison`, `testimonials-carousel`, `testimonials-wall`, `faq-accordion`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

**Same verification as Phase 39.**

---

### Phase 41: Section Blocks Batch 3 (4 blocks)
> `cta-newsletter`, `contact-form`, `header-sticky`, `header-transparent`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

**Same verification as Phase 39.**
- [ ] Additional: `contact-form` works with Astro Actions

---

### Phase 42: Integration Blocks (3 blocks)
> `payments-stripe`, `email-resend`, `analytics-cf`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

**Verification per block:**
- [ ] Manifest parses with correct `requiredMode` and `envVars`
- [ ] Dependency chain works (stripe needs hybrid/server)
- [ ] Scaffold → required env vars documented in generated `.env.example`

---

### Phase 43: Feature Blocks (2 blocks)
> `blog-mdx`, `docs-collection`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

**Verification per block:**
- [ ] Content collections wired correctly
- [ ] MDX processing works
- [ ] Blog: listing page + post page + RSS generated
- [ ] Docs: sidebar navigation generated

---

### Phase 44: Layout Blocks (3 blocks)
> `layout-marketing`, `layout-docs`, `layout-dashboard`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md`

**Verification per block:**
- [ ] All text from content collections
- [ ] Layout includes navigation, responsive shell
- [ ] Dashboard layout requires auth block (tested via dependency resolver)

---

## Tier 8 — MCP Server

AI agents can control Fornix programmatically.

---

### Phase 45: MCP Server Skeleton
> **Package:** `create-fornix` · **Agent:** `mcp-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/mcp-agent.md`

Set up the MCP server and wire the `fornix mcp serve` command.

**What to build:**
- `packages/create-fornix/src/mcp/server.ts`
- Install `@modelcontextprotocol/sdk`
- Register tools (empty handlers): `list_blocks`, `add_block`, `remove_block`, `get_content_schema`, `update_content`, `validate_content`, `get_project_status`, `scaffold_project`
- Register resources: `fornix://registry`, `fornix://project/config`

**Verification:**
- [ ] `fornix mcp serve` starts without crashing
- [ ] MCP client connection succeeds (use Claude Desktop or MCP inspector)

---

### Phase 46: MCP Tool Implementations
> **Package:** `create-fornix` · **Agent:** `mcp-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/mcp-agent.md`

Wire MCP tools to real CLI functions.

**What to build:**
- Each tool calls the corresponding CLI function (list, add, remove, etc.)
- `scaffold_project` runs full AI pipeline

**Verification:**
- [ ] Integration test: `list_blocks` returns block names
- [ ] Integration test: `add_block` creates block files
- [ ] Integration test: `get_project_status` returns manifest
- [ ] Integration test: `validate_content` validates JSON against schema
- [ ] E2E test: simulate MCP client calling tools in sequence (list → add → status)

---

### Phase 47: Auto-Generated Agent Context
> **Package:** `create-fornix` · **Agent:** `mcp-agent.md`
> **Attach:** `.context/AGENTS.md` + `.context/agents/mcp-agent.md` + `.context/agents/scaffold-agent.md`

Auto-generate `CLAUDE.md` and `.cursor/rules/` during scaffold.

**What to build:**
- `packages/create-fornix/src/scaffold/agent-context-generator.ts`
- Generate project-specific `CLAUDE.md` with: architecture, installed blocks table, content collection paths, CLI commands
- Generate `.cursor/rules/fornix.mdc` in Cursor format

**Verification:**
- [ ] Integration test: `CLAUDE.md` includes actual block names from config
- [ ] Integration test: `CLAUDE.md` includes locale info when i18n enabled
- [ ] Integration test: `.cursor/rules/` directory exists
- [ ] E2E test: scaffold project → `CLAUDE.md` is readable and accurate

---

## Tier 9 — Polish & Launch

---

### Phase 48: Recipes
> `--recipe saas`, `--recipe agency`, `--recipe docs`, `--recipe blog`, `--recipe portfolio`
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md` + `.context/agents/registry-agent.md`

**What to build:** Pre-defined `ResolvedConfig` partials. Recipe = curated block list + palette + render mode.

**Verification:**
- [ ] E2E test per recipe: scaffold → `astro check` passes
- [ ] E2E test: `create-fornix ./tmp --recipe saas --yes` works end-to-end

---

### Phase 49: `fornix doctor`
> Diagnose common issues in a Fornix project.
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

**Verification:**
- [ ] Detects missing `fornix.json`
- [ ] Detects orphaned block files (files exist but not in manifest)
- [ ] Detects broken content collection references

---

### Phase 50: Runtime AI Blocks
> `ai-chatbot`, `ai-search`, `ai-og-images`
> **Attach:** `.context/AGENTS.md` + `.context/agents/blocks-agent.md` + `.context/agents/ai-agent.md`

**Verification per block:**
- [ ] Manifest parses
- [ ] Scaffold + deploy to Cloudflare → block works
- [ ] Workers AI + Vectorize integration functions correctly

---

### Phase 51: Error Polish
> Every error message is actionable. Every edge case has a clean exit.
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md`

**Verification:**
- [ ] Invalid project name → helpful message with valid name suggestion
- [ ] Network error during registry fetch → shows cached blocks or offline message
- [ ] Block conflict → names both blocks and explains why they conflict
- [ ] No blocks selected → suggests using `--recipe` or AI mode

---

### Phase 52: Performance
> CLI runs in <10 seconds (excluding install).
> **Attach:** `.context/AGENTS.md` + `.context/agents/testing-agent.md`

**Verification:**
- [ ] Benchmark: `time create-fornix ./tmp --recipe saas --yes` < 10s
- [ ] Benchmark: `time fornix add pricing-table` < 5s

---

### Phase 53: Documentation Site
> Built with Fornix itself (`--recipe docs`).
> **Attach:** `.context/AGENTS.md` + `.context/agents/registry-agent.md`

**Verification:**
- [ ] Docs site builds and deploys
- [ ] Covers: quickstart, blocks reference, AI mode guide, MCP setup, i18n guide, palette system

---

### Phase 54: npm Publish
> `create-fornix` on npm.
> **Attach:** `.context/AGENTS.md` + `.context/agents/cli-agent.md` + `.context/agents/registry-agent.md`

**Verification:**
- [ ] `npx create-fornix --help` works globally
- [ ] `npx create-fornix ./my-site --recipe saas --yes` → project created
- [ ] Registry GitHub repo is public and accessible

---

## Dependency Graph

```
Phase 1-6 (Schemas & Types)
    └── Phase 7-16 (Scaffold Pipeline)
            ├── Phase 17-20 (CLI Framework)
            │       └── Phase 28-31 (Registry Commands)
            │               └── Phase 37 (AI in Create)
            ├── Phase 21-25 (Fixture Blocks)
            │       └── Phase 39-44 (Real Blocks)
            ├── Phase 26-27 (Registry Infrastructure)
            └── Phase 32-38 (AI Layer)
                    └── Phase 45-47 (MCP Server)
                            └── Phase 48-54 (Polish)
```
