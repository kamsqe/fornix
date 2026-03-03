<p align="center">
  <h1 align="center">Fornix</h1>
  <p align="center">CLI-first Astro + Cloudflare project generator with AI-powered scaffolding</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/create-fornix"><img src="https://img.shields.io/npm/v/create-fornix.svg?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/kamsqe/fornix/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  <a href="https://github.com/kamsqe/fornix"><img src="https://img.shields.io/github/stars/kamsqe/fornix?style=flat-square" alt="stars"></a>
</p>

---

## What is Fornix?

Fornix generates production-ready [Astro](https://astro.build) websites optimized for [Cloudflare](https://cloudflare.com) deployment. Describe what you want in plain English — the AI picks blocks, palette, and configuration. Or use recipes, manual mode, or the MCP server for AI-editor integration.

```bash
npx create-fornix my-site
```

## ✨ Features

- **🤖 AI Mode** — Describe your site, get a fully scaffolded project
- **📦 30+ Blocks** — Hero sections, pricing tables, auth, payments, blog, docs, and more
- **🎨 30+ Palettes** — Curated color themes with runtime switcher support
- **🍳 Recipes** — Pre-built configs: `saas`, `agency`, `docs`, `blog`, `portfolio`
- **🌍 i18n** — Multi-locale with zero hardcoded text in components
- **🔌 MCP Server** — AI editors (Claude, Cursor) can manage your project directly
- **⚡ Fast** — Scaffold in < 0.3s, add blocks in < 0.2s
- **☁️ Cloudflare-native** — D1, Workers AI, Vectorize, Pages out of the box

## Quick Start

### AI Mode (default)

```bash
npx create-fornix my-site
# Describe: "A fintech SaaS with auth, payments, and a dark theme"
```

### Recipe Mode

```bash
npx create-fornix my-site --recipe saas --yes
npx create-fornix my-site --recipe agency --yes
npx create-fornix my-site --recipe docs --yes
npx create-fornix my-site --recipe blog --yes
npx create-fornix my-site --recipe portfolio --yes
```

### Manual Mode

```bash
npx create-fornix my-site --manual
```

### Flag-Driven

```bash
npx create-fornix my-site --manual --yes \
  --render server \
  --deploy cloudflare \
  --blocks hero-gradient,pricing-table,faq-accordion \
  --palette midnight
```

## 📦 Available Blocks

### Section Blocks
`hero-gradient` · `hero-split` · `hero-video` · `features-grid` · `features-bento` · `pricing-table` · `pricing-comparison` · `testimonials-carousel` · `testimonials-wall` · `faq-accordion` · `cta-banner` · `cta-newsletter` · `contact-form` · `footer-minimal` · `footer-rich` · `header-sticky` · `header-transparent`

### Integration Blocks
`db-d1` · `auth-better-auth` · `payments-stripe` · `email-resend` · `analytics-cf`

### AI Blocks
`ai-chatbot` · `ai-search` · `ai-og-images`

### Feature Blocks
`blog-mdx` · `docs-collection`

### Layout Blocks
`layout-marketing` · `layout-docs` · `layout-dashboard`

### UI Blocks
`theme-switcher`

## CLI Commands

| Command | Description |
|---------|-------------|
| `fornix create` | Scaffold a new project |
| `fornix add <block>` | Add a block to an existing project |
| `fornix remove <block>` | Remove a block |
| `fornix list` | List available blocks |
| `fornix status` | Show project configuration |
| `fornix doctor` | Diagnose common issues |
| `fornix mcp serve` | Start the MCP server |

## 🎨 Palette System

```bash
# Use a pre-built palette
npx create-fornix my-site --palette midnight

# Enable runtime theme switching
npx create-fornix my-site --palette midnight --theme-switcher
```

**Available:** `midnight` · `obsidian` · `charcoal` · `void` · `snow` · `cotton` · `pearl` · `cream` · `neon-tokyo` · `sunset-glow` · `electric-violet` · `cyber-punk` · `corporate-blue` · `slate-modern` · `ocean-breeze` · `forest` · `ember` · `terracotta` · `glacier` · `deep-sea` · `fintech-dark` · `health-clean` · `startup-bold` · `luxury-gold` and more.

## 🤖 AI Providers

| Provider | Setup |
|----------|-------|
| OpenAI | `export OPENAI_API_KEY=sk-...` |
| Anthropic | `export ANTHROPIC_API_KEY=...` |
| Ollama | Install from [ollama.com](https://ollama.com) (free, local) |
| Cloudflare Workers AI | `export CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...` |
| OpenRouter | `export OPENROUTER_API_KEY=...` |

## 🔌 MCP Integration

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

**Tools:** `list_blocks` · `add_block` · `remove_block` · `get_content_schema` · `update_content` · `validate_content` · `get_project_status` · `scaffold_project`

## 🌍 Internationalization

```bash
npx create-fornix my-site --locales en,es,ar
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
├── wrangler.json             # Cloudflare config
├── src/
│   ├── components/sections/  # Block components
│   ├── content/              # Content collections (JSON)
│   ├── layouts/
│   ├── pages/
│   └── styles/palettes/      # Color themes
└── CLAUDE.md                 # Auto-generated AI context
```

## Monorepo Structure

```
fornix/
├── packages/
│   ├── create-fornix/        # CLI + scaffold engine
│   ├── fornix-registry/      # Block manifest schemas + palettes
│   └── fornix-blocks/        # All block source files
└── docs/                     # Documentation (built with Fornix)
```

## Development

```bash
git clone https://github.com/kamsqe/fornix.git
cd fornix
pnpm install
pnpm --filter create-fornix build
pnpm --filter create-fornix test:unit     # 177 tests
pnpm --filter fornix-blocks test:unit     # 257 tests
```

## License

MIT © [kamsqe](https://github.com/kamsqe)
