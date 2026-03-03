---
title: Quickstart
description: Get up and running with Fornix in under 5 minutes.
---

# Quickstart

## Prerequisites

- **Node.js 20+**
- **pnpm** (recommended) or npm

## Create a Project

### AI Mode (default)

```bash
npx create-fornix my-site
```

Describe your site in plain English. The AI picks the best blocks, palette, and rendering mode.

### Manual Mode

```bash
npx create-fornix my-site --manual
```

Step through interactive prompts to choose blocks, palette, and configuration.

### Recipe Mode

```bash
npx create-fornix my-site --recipe saas --yes
```

Use a pre-built recipe: `saas`, `agency`, `docs`, `blog`, or `portfolio`.

## Run Locally

```bash
cd my-site
pnpm install
pnpm dev
```

Open `http://localhost:4321` in your browser.

## Add Blocks

```bash
fornix add pricing-table
fornix add blog-mdx
```

## Remove Blocks

```bash
fornix remove pricing-table
```

## Check Project Health

```bash
fornix doctor
```

## Deploy to Cloudflare

```bash
pnpm build
npx wrangler pages deploy dist/
```

Your site is live in under 60 seconds.
