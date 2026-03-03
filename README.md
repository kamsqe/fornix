<p align="center">
  <h1 align="center">Fornix</h1>
  <p align="center">CLI-first Astro + Cloudflare project generator with AI-powered scaffolding</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/create-fornix"><img src="https://img.shields.io/npm/v/create-fornix.svg?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/kamsqe/fornix/actions/workflows/ci.yml"><img src="https://github.com/kamsqe/fornix/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/kamsqe/fornix/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  <a href="https://github.com/kamsqe/fornix"><img src="https://img.shields.io/github/stars/kamsqe/fornix?style=flat-square" alt="stars"></a>
</p>

---

## What is Fornix?

Fornix generates production-ready [Astro](https://astro.build) websites optimized for [Cloudflare](https://cloudflare.com) deployment. Describe what you want in plain English — the AI picks blocks, palette, and configuration. Or use recipes, manual mode, or the MCP server for AI-editor integration.

```bash
npx create-fornix my-site
```

## Quick Start

### Recipe Mode (easiest)

Pre-built configurations that scaffold a complete project with one command:

```bash
npx create-fornix my-site --recipe saas --yes
npx create-fornix my-site --recipe agency --yes
npx create-fornix my-site --recipe docs --yes
npx create-fornix my-site --recipe blog --yes
npx create-fornix my-site --recipe portfolio --yes
```

### AI Mode (default)

Requires an AI provider (OpenAI, Ollama, or Cloudflare Workers AI):

```bash
export OPENAI_API_KEY=sk-...
npx create-fornix my-site
# Describe: "A fintech SaaS with auth, payments, and a dark theme"
```

### Manual Mode (interactive prompts)

```bash
npx create-fornix my-site --manual
```

### Flag-Driven (non-interactive)

```bash
npx create-fornix my-site \
  --render server \
  --deploy cloudflare \
  --blocks hero-gradient,pricing-table,faq-accordion \
  --palette midnight \
  --yes
```

## Available Blocks

### Section Blocks
`hero-gradient` `hero-split` `hero-video` `features-grid` `features-bento` `pricing-table` `pricing-comparison` `testimonials-carousel` `testimonials-wall` `faq-accordion` `cta-banner` `cta-newsletter` `contact-form` `footer-minimal` `footer-rich` `header-sticky` `header-transparent`

### Integration Blocks
`db-d1` `auth-better-auth` `payments-stripe` `email-resend` `analytics-cf`

### AI Blocks
`ai-chatbot` `ai-search` `ai-og-images`

### Feature Blocks
`blog-mdx` `docs-collection`

### Layout Blocks
`layout-marketing` `layout-docs` `layout-dashboard`

### UI Blocks
`theme-switcher`

## CLI Commands

All commands are available via `npx create-fornix` or the `fornix` alias when installed globally:

| Command | Description |
|---------|-------------|
| `npx create-fornix my-site` | Scaffold a new project (AI mode) |
| `npx create-fornix my-site --recipe saas --yes` | Scaffold from a recipe |
| `npx create-fornix my-site --manual` | Interactive manual mode |
| `npx create-fornix add <block>` | Add a block to an existing project |
| `npx create-fornix remove <block>` | Remove a block |
| `npx create-fornix list` | List available blocks |
| `npx create-fornix status` | Show project configuration |
| `npx create-fornix doctor` | Diagnose common issues |
| `npx create-fornix mcp serve` | Start the MCP server |

## Palette System

32 curated color palettes with light/dark modes:

```bash
# Use a pre-built palette
npx create-fornix my-site --recipe saas --palette midnight --yes

# Enable runtime theme switching
npx create-fornix my-site --recipe saas --palette midnight --theme-switcher --yes
```

**Available palettes:** `midnight` `obsidian` `charcoal` `void` `snow` `cotton` `pearl` `cream` `neon-tokyo` `sunset-glow` `electric-violet` `cyber-punk` `corporate-blue` `slate-modern` `ocean-breeze` `forest` `ember` `terracotta` `glacier` `deep-sea` `fintech-dark` `health-clean` `startup-bold` `luxury-gold` `arctic` `copper` `cream` `desert-sand` `executive` `frost` `golden-hour` `storm` `trust`

## AI Providers

| Provider | Setup |
|----------|-------|
| OpenAI | `export OPENAI_API_KEY=sk-...` |
| Ollama (free, local) | Install from [ollama.com](https://ollama.com), run `ollama pull llama3.1` |
| Cloudflare Workers AI | `export CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...` |

## MCP Integration

Connect your AI editor to manage Fornix projects:

```json
{
  "mcpServers": {
    "fornix": {
      "command": "npx",
      "args": ["create-fornix", "mcp", "serve"]
    }
  }
}
```

**Tools:** `list_blocks` `add_block` `remove_block` `get_content_schema` `update_content` `validate_content` `get_project_status` `scaffold_project`

## Internationalization

```bash
npx create-fornix my-site --blocks hero-gradient --locales en,es,ar --yes
```

- Zero hardcoded text in components — all content comes from JSON files
- Per-locale content directories
- RTL support for Arabic, Hebrew, etc.
- AI generates culturally appropriate copy for all locales

## Project Structure

```
my-site/
├── astro.config.mjs
├── fornix.json              # Project manifest
├── package.json
├── tsconfig.json
├── .env.example             # Required env vars
├── src/
│   ├── components/sections/ # Block components
│   ├── content/             # Content collections (JSON)
│   ├── layouts/
│   ├── pages/
│   └── styles/palettes/     # Color themes
├── CLAUDE.md                # Auto-generated AI context
└── .cursor/rules/fornix.mdc # Cursor AI context
```

## Development

```bash
git clone https://github.com/kamsqe/fornix.git
cd fornix
pnpm install

# Run all checks (three gates)
pnpm typecheck                                         # 0 errors
pnpm test:unit                                         # 490 tests
pnpm test:integration                                  # 89 tests

# Build and run CLI tests
pnpm --filter create-fornix build
pnpm --filter create-fornix vitest run tests/e2e/cli-ci.test.ts  # 29 tests
```

### Monorepo Structure

```
fornix/
├── packages/
│   ├── create-fornix/     # CLI + scaffold engine + AI + MCP
│   ├── fornix-registry/   # Block manifest schemas + 32 palettes
│   └── fornix-blocks/     # 30+ block source files
├── .github/workflows/     # CI pipeline
└── docs/                  # Documentation
```

## License

MIT © [kamsqe](https://github.com/kamsqe)
