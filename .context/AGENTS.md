# Fornix — AI Agent Constitution

Last verified: 2026-03-03

## Identity

Fornix is a CLI-first Astro + Cloudflare project generator. It scaffolds clean, standard Astro projects from a curated block registry. AI is the primary interface; manual CLI is the fallback.

**Entry points:**
- `npx create-fornix [dir]` — scaffold a new project (AI mode default, `--manual` for interactive)
- `fornix add <block>` / `fornix remove <block>` — manage blocks
- `fornix list` / `fornix status` — inspect registry and project
- `fornix mcp serve` — MCP server for AI agent integration

## Architecture

```
User Input → [Prompts / AI Engine] → ResolvedConfig → Scaffold Pipeline → Files
```

```
packages/
├── create-fornix/     # The CLI (commands, prompts, scaffold, AI engine, MCP server)
├── fornix-registry/   # Block metadata schemas + registry tooling
└── fornix-blocks/     # Actual block source files (self-contained)
```

The scaffold pipeline is a **pure function**: `scaffold(config: ResolvedConfig) → files`. No side effects, no user prompts inside the pipeline. All decisions happen before. All filesystem writes happen after.

**i18n rule:** When the user specifies 2+ languages, the generated project uses **zero hardcoded text**. All strings route through content collections keyed by locale. Blocks must source ALL visible text from `src/content/` — never from inline strings in `.astro` files.

**Palette system:** Fornix ships dozens of pre-built color palettes (curated, named). Users pick a palette at scaffold time or generate one via AI. Generated projects can optionally include a runtime theme switcher to swap palettes without rebuild.

## Core Contracts (violating these breaks the project)

| Contract | Location | Purpose |
|----------|----------|---------|
| `ResolvedConfig` | `packages/create-fornix/src/schemas/config.ts` | Input to `scaffold()`. The ONLY way to control what gets generated. Includes `locales`, `defaultLocale`, `palette`, and `themeSwitcher` fields. |
| `BlockManifest` | `packages/fornix-registry/src/schemas/block-manifest.ts` | Describes a block's identity, deps, files, AI metadata. Has `schemaVersion` for migration safety. Blocks declare `contentSlots` which are locale-aware when i18n is enabled. |
| `ProjectManifest` | `packages/create-fornix/src/schemas/project-manifest.ts` | Tracks what's installed. CLI reads it, Astro does NOT. |
| `IntentSchema` | `packages/create-fornix/src/ai/schemas.ts` | Structured AI output — classified user intent for the rules engine. Includes `languages` and `palettePreference` fields. |
| `PaletteRegistry` | `packages/fornix-registry/src/schemas/palette.ts` | Defines pre-built palettes (name, colors, mode). The scaffold picks from this or generates via AI. |

## Principles (strict — never violate)

### Architecture
1. **Additive, never subtractive.** Compose from zero. If a block isn't selected, zero lines of its code exist.
2. **Scaffold = pure function.** `config in → files out`. No side effects, no env reads, no user prompts inside.
3. **Strict layer separation.** `Prompts (or AI) → ResolvedConfig → Scaffold → Post-Scaffold Hooks`. Each layer only talks to the next via the typed contract.
4. **Every block is self-contained.** `.astro`, `.css`, content schema, default content — all co-located. A block never reaches into another block's files. Dependencies are declared in `block.json`.
5. **No runtime dependency on Fornix.** Generated projects are standard Astro. No `fornix` import in any generated file.

### Code Quality
6. **Types from Zod.** Every contract is a Zod schema first. Types derived via `z.infer<typeof Schema>`. Never define a type separately from its validation.
7. **TDD for pure logic.** Tests first, then implementation, for all pure functions.
8. **Zero `any`. Zero `as` casts. Zero `@ts-ignore`.** Fix the design, not the type system.
9. **Explicit over implicit.** No barrel files. No magic strings. No auto-discovery by directory convention. Every import is direct.
10. **Errors are data.** Functions that can fail return `Result<T, E>`. Exceptions only for truly exceptional cases.
    ```typescript
    type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }
    ```

### AI-Specific
11. **AI writes structured data, not code.** AI produces typed JSON (`IntentSchema`, `ProposedConfig`, `ContentMap`). Never raw code strings.
12. **Rules before AI, AI before prompts.** Decision priority: deterministic rules first → AI classification for ambiguous decisions → user prompts only for true preferences.
13. **Hybrid intelligence.** Rules handle deterministic decisions (auth → SSR). AI handles ambiguous ones (which hero variant fits fintech?).

### Style & Naming
14. **Files:** `kebab-case.ts` — **Types:** `PascalCase` — **Functions:** `camelCase` — **Constants:** `UPPER_SNAKE`
15. **Files match exports.** `dependency-resolver.ts` exports `resolveDependencies()`.
16. **No abbreviations.** `configuration` not `cfg`, `dependencies` not `deps`. Exception: universally known acronyms (AI, CLI, MCP, API, URL).
17. **Conventional Commits.** `feat(scaffold):`, `fix(resolver):`, `test(ai):`, `docs(readme):`, `chore(deps):`
18. **No dead code. No commented-out code.** No TODO without an issue link: `// TODO(#42): handle edge case`

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm test:unit` | Unit tests (<1s, pure logic) |
| `pnpm test:integration` | Integration tests (<30s, scaffold output) |
| `pnpm test:e2e` | E2E tests (<5min, full binary) |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm lint` | ESLint |

## Three Gates (every PR must pass)

1. `pnpm typecheck` → 0 errors
2. `pnpm test:unit` → 0 failures
3. `pnpm test:integration` → 0 failures

## Routing Table — Read Before You Code

| If working on... | Read first |
|-------------------|-----------|
| Scaffold pipeline | `.context/agents/scaffold-agent.md` |
| Block creation | `.context/agents/blocks-agent.md` |
| CLI commands/UX | `.context/agents/cli-agent.md` |
| AI/LLM integration | `.context/agents/ai-agent.md` |
| Tests | `.context/agents/testing-agent.md` |
| Registry/publishing | `.context/agents/registry-agent.md` |
| MCP server | `.context/agents/mcp-agent.md` |

## Top Known Failures

(populated as bugs are found and fixed)

## Development Phases

| Phase | Goal | Exit Criteria |
|-------|------|---------------|
| **0: Foundation** | Monorepo builds, tests run, CI green. Define core Zod schemas + `IntentSchema` + `AIProvider` interface + mock provider + `PaletteRegistry`. Create fixture blocks. | `pnpm test:unit` passes with schema validation tests |
| **1: Core Scaffold** | Given a hardcoded config, produce a valid Astro project. Include i18n routing (Astro i18n) when `locales.length >= 2`. Include palette CSS custom properties. Implement rules engine. | `scaffold(config)` → project passes `astro check` (with and without i18n) |
| **2: Prompts + Basic AI** | Manual AND AI paths both work. Palette picker (browse pre-built palettes). Language selection prompt. Provider abstraction, conversation loop. | `npx create-fornix --ai` and `--manual` both work end-to-end |
| **3: Block Registry + Content** | Remote block fetching. AI content generation pipeline. Multi-locale content generation for i18n projects. | `fornix add pricing-table` fetches and wires correctly, generating content for all configured locales |
| **4: Real Blocks** | 20+ blocks. All blocks support i18n (zero hardcoded text). Pre-built palette collection (30+). Optional theme switcher block. | All blocks pass scaffold + build in both single-locale and multi-locale configs |
| **5: MCP + Agent Integration** | MCP server with all tools. Auto-generate CLAUDE.md and .cursor/rules during scaffold. | Claude Desktop can add a block and update content via MCP |
| **6: Runtime AI Blocks** | Optional AI-powered features: chatbot (Workers AI + Vectorize RAG), semantic search, OG images. | Blocks deploy and work on Cloudflare |
| **7: Polish & Launch** | Recipes, `fornix doctor`, docs site (built with Fornix), npm publish. | Production-ready CLI |

## Context Maintenance

After completing a task that changes architecture, patterns, or fixes a recurring bug:
1. If it affects the overall project → update this file
2. If it affects a specific domain → update `.context/agents/{domain}-agent.md`
3. If it's a specific bug fix or decision → add to `.context/knowledge/`
4. Add "Last verified: YYYY-MM-DD" to any file you update

## Post-Session Checklist

1. Did I change any file structure? → Update this file's architecture section
2. Did I add a new module or major function? → Update the relevant domain agent
3. Did I fix a bug that took >15 minutes? → Add a bug post-mortem to `.context/knowledge/bugs/`
4. Did I establish a pattern I'll repeat? → Add to `.context/knowledge/patterns/`
5. Did I make an architectural choice? → Add an ADR to `.context/knowledge/adr/`
6. Did I read any context file? → Update its "Last verified" date
7. Did the build/test commands change? → Update this file's commands table
