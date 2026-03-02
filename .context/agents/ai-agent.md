# AI Agent

Last verified: 2026-03-03

## Purpose

The AI layer is the primary user interface. It analyzes natural language descriptions, classifies user intent into structured data, and produces a `ResolvedConfig` — the same contract the manual prompts produce. AI is NOT a feature bolted on; the architecture assumes AI is the decision-maker.

## Architecture

```
User Description → AI Engine → Intent (structured) → Rules Engine → ProposedConfig → User Confirms → ResolvedConfig
```

The AI layer is a pipeline of specialized steps, NOT a single monolithic LLM call.

### The AI Engine Interface

```typescript
interface AIEngine {
  analyze(input: UserInput, registry: BlockRegistry): Promise<AnalysisResult>
  clarify(analysis: AnalysisResult, previousAnswers: Answer[]): Promise<Question[]>
  resolve(analysis: AnalysisResult, answers: Answer[]): Promise<ProposedConfig>
  generateContent(config: ProposedConfig, context: ProjectContext): Promise<ContentMap>
  generatePalette(brandContext: BrandContext): Promise<Palette>
}
```

### The Two Modes — Same Output

| Mode | Entry Point | Who Decides |
|------|------------|-------------|
| **AI mode** (default) | `npx create-fornix --ai` or `npx create-fornix` | AI picks blocks, palette, mode |
| **Manual mode** | `npx create-fornix --manual` | User picks step-by-step via @clack/prompts |

Both produce the same `ResolvedConfig`. The scaffold pipeline doesn't know or care which mode created it.

## IntentSchema (what the LLM actually produces)

The LLM returns structured data via Zod schemas + `generateObject()` from the Vercel AI SDK. Never free-form text.

```typescript
IntentSchema {
  siteType: 'landing-page' | 'saas' | 'agency' | 'portfolio' | 'blog' | 'docs' | 'ecommerce' | 'dashboard' | 'community' | 'other'
  industry: string
  brand: { name, tagline?, description, targetAudience?, tone }
  needsAuth, needsPayments, needsBlog, needsDocs, needsDashboard, needsContactForm, needsNewsletter: boolean
  hasDynamicContent, hasEcommerce, hasUserAccounts: boolean
  prefersDarkMode: boolean
  visualStyle: 'minimal' | 'bold' | 'glassmorphism' | 'gradient' | 'flat' | 'neo-brutalist'
  languages: string[]            // e.g. ['en', 'ar'] — extracted from user description
  palettePreference: 'custom' | 'prebuilt' | 'ai-generated' | 'unspecified'
  wantsThemeSwitcher: boolean    // user mentioned multiple themes / dark+light mode switching
  recommendedBlocks: Array<{ blockName, reason, confidence }>
  uncertainties: Array<{ topic, question, defaultAssumption }>
  overallConfidence: number (0-1)
}
```

## Rules Engine (deterministic, no AI needed)

Rules execute BEFORE AI for unambiguous decisions:

| Signal | Rule |
|--------|------|
| `needsAuth` or `hasUserAccounts` | → `renderMode = 'server'`, add `auth-better-auth` + `db-d1` |
| `needsPayments` or `hasEcommerce` | → upgrade to `hybrid` if static, add `payments-stripe` |
| `isBlog` and no dynamic content | → `renderMode = 'static'`, add `blog-mdx` |
| `deployTarget = 'cloudflare'` | → add `analytics-cf` (free, zero-config) |
| `languages.length >= 2` | → enable i18n mode: set `locales`, `defaultLocale`, zero-hardcoded-text scaffold, add `i18n` wiring |
| `wantsThemeSwitcher` | → set `themeSwitcher = true`, add `theme-switcher` block, include all pre-built palette CSS files |

Rules are unit-testable with 100% coverage. AI decisions need fuzzy evaluation.

## AI Provider Strategy

### Provider Interface

```typescript
interface AIProvider {
  name: string
  generate<T extends z.ZodType>(opts: { system: string, prompt: string, schema: T, maxTokens?: number }): Promise<z.infer<T>>
  stream(opts: { system: string, prompt: string }): AsyncIterable<string>
}
```

### Supported Providers

| Provider | Config | Best For |
|----------|--------|----------|
| **Cloudflare Workers AI** | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | Default for CF targets, free tier |
| **OpenAI** | `OPENAI_API_KEY` | Best structured outputs |
| **Anthropic** | `ANTHROPIC_API_KEY` | Best reasoning |
| **Ollama** (local) | Auto-detect `localhost:11434` | Free, offline, privacy |
| **OpenRouter** | `OPENROUTER_API_KEY` | Access to any model |

### Resolution Order

1. Explicit `--provider` flag
2. Auto-detect local Ollama
3. Check env vars: Anthropic → OpenAI → Cloudflare → OpenRouter
4. No provider found → offer guidance, suggest `--manual`

Implementation uses the Vercel AI SDK (`ai` package) and its `generateObject()` for structured outputs with Zod schemas.

## Conversation Protocol

```
Phase 1: UNDERSTANDING — AI receives description + full registry → returns AnalysisResult
Phase 2: CLARIFICATION — If confidence < 0.8, ask follow-up questions (max 3 rounds)
Phase 3: RESOLUTION — AI produces ProposedConfig with concrete block selections + palette
Phase 4: CONFIRMATION — Display summary, user accepts/modifies/regenerates/cancels
Phase 5: SCAFFOLD — ProposedConfig → validate → ResolvedConfig → scaffold()
```

### Smart Question Design

Questions must be intent-focused, not technical:
- ❌ "What rendering mode: static, hybrid, or server?"
- ✅ "Will users need to log in or create accounts?" (yes → SSR + auth)
- ✅ "Is this a site people just read, or will they interact?" (read → static)
- ✅ "Will this site be in multiple languages?" (yes → i18n mode, zero hardcoded text)
- ✅ "Want visitors to switch between color themes?" (yes → theme switcher + palette CSS)

Questions have priority: architecture-impacting first, content/style last.

## Content Generation

Each block declares `ai.contentSlots` in `block.json` with typed fields, `maxLength`, and examples. AI generates contextual copy that fits the brand and industry. Content lives in `src/content/` as JSON — separate from `.astro` components.

**Multi-locale content:** When i18n is enabled (`locales.length >= 2`), the AI generates content for ALL configured locales. Each locale gets its own content files. The AI uses the `brand.tone` and industry to produce culturally appropriate copy for each language.

**Palette selection:** AI picks a palette based on industry, visual style, and brand description. It can either select from the pre-built palette collection (preferred) or generate custom colors. For fintech → dark palettes, for healthcare → clean/light, for gaming → vibrant/bold, etc.

Quality controls: industry-aware prompting, length constraints, example-driven generation, user review in confirmation phase.

## System Prompt

The system prompt dynamically includes the full block registry (names, descriptions, categories, tags, `whenToUse`, `whenNotToUse`, `pairsWith`). Registry metadata is the AI's knowledge base for making block selections.

### Registry Scaling

At 50+ blocks, the full registry may exceed context windows on smaller models (~4K tokens for 100 blocks). Mitigation tiers:

| Block Count | Strategy |
|-------------|----------|
| **< 50** | Full registry in system prompt (current approach) |
| **50-100** | Summarized registry (name + category + tags only) in system prompt, full details fetched on demand for blocks the AI shortlists |
| **100+** | Embedding-based retrieval — index block descriptions with embeddings, search by user description similarity, include only top-20 relevant blocks in prompt |

## Test Strategy

- **Rules engine:** 100% deterministic, unit tests with full coverage
- **AI responses:** fixture-based (recorded real responses replayed in tests)
- **Mock provider:** for integration tests without hitting real APIs
- **Prompts:** snapshot tests to catch accidental changes
- **Live AI tests:** optional CI-only (`AI_TEST=true`), verify quality not correctness
