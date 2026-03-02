# Registry Agent

Last verified: 2026-03-03

## Purpose

The block registry is a GitHub repo containing all available blocks. The CLI fetches blocks from it remotely using **giget**. The registry also serves as the AI's knowledge base — each block's manifest tells the AI when and how to use it.

## Registry Structure

```
registry/
├── registry.json            # Index of all blocks with metadata
└── blocks/
    ├── hero-gradient/
    │   ├── block.json
    │   ├── hero-gradient.astro
    │   ├── hero-gradient.css
    │   ├── schema.ts
    │   └── default-content.json
    ├── pricing-table/
    │   └── ...
    └── ...
```

## Block Fetching

Uses **giget** to download individual block directories from GitHub. Downloaded blocks are locally cached to avoid re-downloading on repeated `fornix add`.

## Registry as AI Knowledge Base

The AI system prompt dynamically includes the full registry. Each block's `ai.whenToUse`, `ai.whenNotToUse`, and `ai.pairsWith` fields give the LLM rich context for good selections.

## Commands That Use the Registry

| Command | Registry Interaction |
|---------|---------------------|
| `fornix list` | Fetch and display `registry.json` |
| `fornix add <block>` | Fetch block dir, run dep resolver, place files |
| `create-fornix` (AI mode) | Load full registry into AI system prompt |

## Planned Blocks

### Section Blocks
`hero-gradient`, `hero-split`, `hero-video`, `features-grid`, `features-bento`, `pricing-table`, `pricing-comparison`, `testimonials-carousel`, `testimonials-wall`, `faq-accordion`, `cta-banner`, `cta-newsletter`, `contact-form`, `footer-minimal`, `footer-rich`, `header-sticky`, `header-transparent`

### UI Blocks
`theme-switcher` — runtime palette switcher (client-side script + toggle UI, swaps CSS custom properties, persists to `localStorage`)

### Integration Blocks
`db-d1`, `auth-better-auth`, `payments-stripe`, `email-resend`, `analytics-cf`

### Feature Blocks
`blog-mdx`, `docs-collection`

### Layout Blocks
`layout-marketing`, `layout-docs`, `layout-dashboard`

### Runtime AI Blocks (Phase 6)
`ai-chatbot` (Workers AI + Vectorize RAG), `ai-search` (semantic search), `ai-og-images` (dynamic OG images)

## Pre-Built Palette Collection

Fornix ships 30+ curated, named palettes. Each palette defines CSS custom properties for `primary`, `secondary`, `accent`, `background`, and `foreground`. Palettes are categorized:

| Category | Example Palettes |
|----------|------------------|
| Dark | `midnight`, `obsidian`, `charcoal`, `void` |
| Light | `snow`, `cotton`, `pearl`, `cream` |
| Vibrant | `neon-tokyo`, `sunset-glow`, `electric-violet`, `cyber-punk` |
| Professional | `corporate-blue`, `slate-modern`, `executive`, `trust` |
| Nature | `ocean-breeze`, `forest`, `desert-sand`, `arctic` |
| Warm | `ember`, `terracotta`, `golden-hour`, `copper` |
| Cool | `glacier`, `deep-sea`, `frost`, `storm` |
| Brand-inspired | `fintech-dark`, `health-clean`, `startup-bold`, `luxury-gold` |

Palettes are stored in `packages/fornix-registry/palettes/` as JSON. During scaffold, the selected palette's colors are injected as CSS custom properties on `:root`. When `themeSwitcher` is enabled, ALL palettes are included as individual CSS files for runtime swapping.

## Anti-Patterns

- **Never** modify the registry in place during scaffold — copy blocks to the project
- **Never** assume network availability — cache blocks locally, handle offline gracefully
