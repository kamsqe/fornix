---
title: Blocks Reference
description: Complete reference for all available Fornix blocks.
---

# Blocks Reference

Blocks are the atomic units of Fornix. Each block is self-contained with its own manifest, components, styles, and content schema.

## Section Blocks

| Block | Description | Category |
|-------|-------------|----------|
| `hero-gradient` | Gradient hero section with CTA buttons | hero |
| `hero-split` | Split-layout hero with image and text | hero |
| `hero-video` | Video background hero section | hero |
| `features-grid` | Feature cards in a responsive grid | features |
| `features-bento` | Bento-box style feature layout | features |
| `pricing-table` | Tiered pricing cards | pricing |
| `pricing-comparison` | Side-by-side pricing comparison table | pricing |
| `testimonials-carousel` | Rotating testimonial cards | social-proof |
| `testimonials-wall` | Masonry wall of testimonials | social-proof |
| `faq-accordion` | Expandable FAQ section | faq |
| `cta-banner` | Call-to-action banner strip | cta |
| `cta-newsletter` | Newsletter signup CTA with email input | cta |
| `contact-form` | Contact form with Astro Actions | forms |
| `footer-minimal` | Clean minimal footer | footer |
| `footer-rich` | Multi-column footer with links | footer |
| `header-sticky` | Sticky navigation header | header |
| `header-transparent` | Transparent overlay header | header |

## Integration Blocks

| Block | Description | Required Mode |
|-------|-------------|---------------|
| `db-d1` | Cloudflare D1 database with Drizzle ORM | server |
| `auth-better-auth` | Authentication via Better Auth | server |
| `payments-stripe` | Stripe payment integration | hybrid |
| `email-resend` | Transactional email via Resend | hybrid |
| `analytics-cf` | Cloudflare Web Analytics | any |

## AI Blocks

| Block | Description | Required Mode |
|-------|-------------|---------------|
| `ai-chatbot` | Workers AI chatbot with streaming | server |
| `ai-search` | Semantic search via Vectorize | server |
| `ai-og-images` | AI-generated Open Graph images | hybrid |

## Feature Blocks

| Block | Description |
|-------|-------------|
| `blog-mdx` | MDX-powered blog with content collections |
| `docs-collection` | Documentation site with sidebar navigation |

## Layout Blocks

| Block | Description |
|-------|-------------|
| `layout-marketing` | Marketing landing page shell |
| `layout-docs` | Documentation page shell with sidebar |
| `layout-dashboard` | Dashboard layout with navigation |

## UI Blocks

| Block | Description |
|-------|-------------|
| `theme-switcher` | Runtime palette switcher with localStorage persistence |

## Block Manifest

Every block has a `block.json` manifest defining its identity, dependencies, files, and AI metadata:

```json
{
  "name": "hero-gradient",
  "type": "section",
  "requiredMode": "static",
  "dependencies": {},
  "requires": [],
  "conflicts": ["hero-split", "hero-video"],
  "ai": {
    "whenToUse": "For a bold, eye-catching landing page hero",
    "pairsWith": ["features-grid", "cta-banner"]
  }
}
```
