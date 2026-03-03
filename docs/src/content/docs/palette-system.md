---
title: Palette System
description: Use pre-built palettes or create custom color themes.
---

# Palette System

Fornix ships with 30+ curated, named palettes. Each palette defines CSS custom properties for consistent theming across all blocks.

## Using a Palette

```bash
npx create-fornix my-site --palette midnight --yes
```

## Available Palettes

### Dark Palettes
`midnight`, `obsidian`, `charcoal`, `void`

### Light Palettes
`snow`, `cotton`, `pearl`, `cream`

### Vibrant Palettes
`neon-tokyo`, `sunset-glow`, `electric-violet`, `cyber-punk`

### Professional Palettes
`corporate-blue`, `slate-modern`, `executive`, `trust`

### Nature Palettes
`ocean-breeze`, `forest`, `desert-sand`, `arctic`

### Warm Palettes
`ember`, `terracotta`, `golden-hour`, `copper`

### Cool Palettes
`glacier`, `deep-sea`, `frost`, `storm`

### Brand-Inspired Palettes
`fintech-dark`, `health-clean`, `startup-bold`, `luxury-gold`

## Color Properties

Every palette defines 5 CSS custom properties:

```css
:root {
  --color-primary: #6366f1;
  --color-secondary: #818cf8;
  --color-accent: #c084fc;
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
}
```

All blocks reference these properties, so changing the palette instantly updates the entire site.

## Theme Switcher

Enable runtime palette switching:

```bash
npx create-fornix my-site --palette midnight --theme-switcher
```

This adds the `theme-switcher` block which:
- Includes ALL palette CSS files in the bundle
- Provides a toggle UI for switching palettes
- Persists the user's choice to `localStorage`
- Swaps CSS custom properties at runtime

## AI Palette Selection

In AI mode, the AI picks a palette based on your project description:

| Industry | Typical Palette |
|----------|----------------|
| Fintech | `fintech-dark`, `midnight` |
| Healthcare | `health-clean`, `snow` |
| Gaming | `neon-tokyo`, `cyber-punk` |
| Corporate | `corporate-blue`, `executive` |
| Creative | `sunset-glow`, `electric-violet` |
