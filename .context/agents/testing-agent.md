# Testing Agent

Last verified: 2026-03-03

## Purpose

Testing strategy for a CLI-first project spanning three layers: pure logic, filesystem operations, and interactive user flows.

## Test Pyramid

```
        /  E2E  \          ~10 tests   (slow, full binary)
       /----------\
      / Integration \      ~40 tests   (medium, filesystem + scaffold)
     /----------------\
    /    Unit Tests     \  ~100+ tests (fast, pure logic, <1s)
   /--------------------\
```

## Layer 1: Unit Tests (no filesystem, no network)

**What:** Pure functions with zero side effects.

| Module | What to Test |
|--------|-------------|
| `block-manifest.ts` | Parsing + validating `block.json` |
| `dependency-resolver.ts` | Dep resolution, conflict detection, topological sort |
| `config-schema.ts` | Validating ResolvedConfig (Zod) |
| `template-engine.ts` | String interpolation in generated files |
| `ai/rules.ts` | Rules engine (auth → SSR, etc.) — 100% deterministic |
| `ai/prompt-builder.ts` | Building structured prompts from input |
| `ai/response-parser.ts` | Parsing AI responses into block selections |
| `utils/naming.ts` | Slug generation, path normalization |
| `utils/detect.ts` | Package manager detection, git repo detection |

**Principle:** If mocking more than one thing, the function under test is doing too much. Extract pure logic.

## Layer 2: Integration Tests (filesystem, no network)

**What:** Scaffold pipeline — given a config, does the CLI produce correct filesystem output?

### memfs (fast, in-memory)

Mock `node:fs` and `node:fs/promises` with memfs. Verify:
- Correct files exist at correct paths
- Config file contents are correct
- Only requested block files are present
- `package.json` has only needed dependencies
- No files from unselected blocks leak in

**Known limitation:** memfs doesn't support all Node.js fs APIs (e.g., `fs.cp` recursive, some stream behaviors).

### Real filesystem (temp directories)

For tests that verify output works with real tools:
- `astro check` on generated projects (catches TypeScript/import errors)
- `astro build` on generated projects (ultimate proof — slow, CI only)

### Key Scenarios to Cover

| Scenario | Verify |
|----------|--------|
| Static + Cloudflare + 3 blocks | Correct files, config, deps, passes `astro check` |
| SSR + Cloudflare + auth + db | D1 migration, drizzle config, auth routes, `wrangler.toml` |
| Hybrid + Vercel + blog | MDX config, content collections, correct adapter |
| Single block add | New files placed, deps added, nothing else changed |
| Block remove | Files removed, deps cleaned, no broken imports |
| Every block in isolation | Each block scaffolds alone without errors |

### Block Combination Testing at Scale

Do NOT test the full N×N matrix. Use tiers:

| Tier | What | Scope |
|------|------|-------|
| **Isolation** | Every block scaffolds alone | All blocks (automated) |
| **Recipes** | Each recipe's exact block set | 5-6 recipes (automated) |
| **Pairwise** | Each block pair that declares `pairsWith` | ~20-30 pairs (automated) |
| **Conflict** | Every `conflicts` pair is tested for rejection | All declared conflicts (automated) |
| **Random** | CI picks 5 random 3-block combos per run | Rotating coverage (CI-only) |

### Snapshot Testing

Take file tree snapshots for each scaffold configuration. Catches regressions instantly.

## Layer 3: E2E Tests (full CLI binary)

### Flag-driven (non-interactive)

Run the actual compiled binary with `--yes` and explicit flags. Verify exit codes, stdout, generated file contents.

### Interactive (PTY simulation)

Use pseudo-terminal to simulate user input. Note: timing-based waits are flaky in CI. Consider DI abstraction for prompts.

## Run Strategy

| Command | When | Speed |
|---------|------|-------|
| `pnpm test:unit` | Every save during dev | <1s |
| `pnpm test:integration` | Before every commit | <30s |
| `pnpm test:e2e` | CI on every PR | <5min |
| `pnpm test` | Full suite | All three in sequence |

## Fixture Conventions

Use minimal fixture blocks in `tests/fixtures/blocks/` — tiny, predictable, never change unless schema changes. Don't test against real registry blocks in unit/integration tests.

## AI Testing

- **Mock provider:** returns recorded fixture responses
- **Fixture responses:** `tests/fixtures/ai-responses/` — recorded JSON from real API calls
- **Rule tests:** 100% deterministic, no mocks needed
- **Prompt snapshots:** catch accidental prompt changes
- **Live tests:** `AI_TEST=true` env var, CI-optional, test quality not correctness

## CI Pipeline

```yaml
steps:
  - pnpm install
  - pnpm typecheck
  - pnpm lint
  - pnpm test:unit
  - pnpm build
  - pnpm test:integration
  - pnpm test:e2e
```

Matrix: Node 20, 22.
