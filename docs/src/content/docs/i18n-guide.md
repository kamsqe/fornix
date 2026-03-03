---
title: i18n Guide
description: Build multi-language sites with Fornix's internationalization system.
---

# i18n Guide

Fornix supports multi-locale sites with zero hardcoded text in components.

## Enable i18n

### During Scaffold

```bash
npx create-fornix my-site --locales en,es,ar
```

### With Flags

```bash
npx create-fornix my-site --locales en,fr,de --manual --yes
```

## Content Structure

When 2+ locales are configured, content is organized by locale:

```
src/content/
├── en/
│   └── sections/
│       ├── hero-gradient.json
│       └── pricing-table.json
├── es/
│   └── sections/
│       ├── hero-gradient.json
│       └── pricing-table.json
└── config.ts
```

Single-locale projects use a flat structure:

```
src/content/
├── sections/
│   ├── hero-gradient.json
│   └── pricing-table.json
└── config.ts
```

## Zero Hardcoded Text

Every visible string in `.astro` components comes from content collections. This means:

- Users edit content without touching component code
- AI agents manage content via simple JSON file edits
- Content is validated by Zod schemas
- Content can be sourced from any backend

## Content Schema

Each block declares its content shape in `block.json`:

```json
{
  "ai": {
    "contentSlots": {
      "headline": { "type": "string", "maxLength": 80 },
      "subheadline": { "type": "string", "maxLength": 200 },
      "ctaText": { "type": "string", "maxLength": 30 }
    }
  }
}
```

## AI Content Generation

When using AI mode, Fornix generates culturally appropriate copy for ALL configured locales. The AI uses your brand description, industry, and tone to produce natural translations.

## RTL Support

When a locale like `ar` (Arabic) or `he` (Hebrew) is included, the scaffold automatically configures `dir="rtl"` for those locale routes.
