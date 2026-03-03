---
title: AI Mode Guide
description: How AI-powered scaffolding works in Fornix.
---

# AI Mode Guide

AI mode is the default experience. Describe what you want, and the AI selects blocks, palette, and configuration.

## How It Works

```
You describe → AI analyzes → Rules engine refines → You confirm → Scaffold
```

1. **Understanding** — AI receives your description + the full block registry
2. **Clarification** — If confidence < 80%, the AI asks follow-up questions (max 3 rounds)
3. **Resolution** — AI produces a `ProposedConfig` with concrete block selections
4. **Confirmation** — You review and accept, modify, or regenerate
5. **Scaffold** — Files are written to disk

## Usage

```bash
# Default AI mode
npx create-fornix my-site

# With a pre-written description
npx create-fornix my-site --yes --description "A fintech SaaS with auth and payments"
```

## Supported Providers

| Provider | Setup | Best For |
|----------|-------|----------|
| **OpenAI** | `export OPENAI_API_KEY=sk-...` | Best structured outputs |
| **Anthropic** | `export ANTHROPIC_API_KEY=...` | Best reasoning |
| **Ollama** | Install from ollama.com | Free, offline, privacy |
| **Cloudflare Workers AI** | `export CLOUDFLARE_ACCOUNT_ID=...` | Free tier for CF targets |
| **OpenRouter** | `export OPENROUTER_API_KEY=...` | Access to any model |

## Provider Resolution

1. Explicit `--provider` flag
2. Auto-detect local Ollama
3. Check env vars: Anthropic → OpenAI → Cloudflare → OpenRouter
4. No provider → offers guidance and suggests `--manual` mode

## Rules Engine

Deterministic rules run before AI for unambiguous decisions:

| Signal | Automatic Rule |
|--------|----------------|
| Needs auth or user accounts | → `renderMode: server`, add `auth-better-auth` + `db-d1` |
| Needs payments | → upgrade to hybrid, add `payments-stripe` |
| Blog with no dynamic content | → `renderMode: static`, add `blog-mdx` |
| Deploy to Cloudflare | → add `analytics-cf` |
| Multiple languages | → enable i18n mode with zero hardcoded text |

## Content Generation

The AI generates contextual copy for all installed blocks based on your brand description, industry, and tone. Content is placed in `src/content/` as JSON files — completely separate from components.
