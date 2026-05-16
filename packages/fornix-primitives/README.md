# fornix-primitives

Astro UI primitives — `<Button>`, `<Card>`, `<Badge>`, `<Icon>`, `<Headline>`, `<Eyebrow>`, `<Section>`, `<Container>` — consumed by Fornix blocks and copied into every scaffolded project (shadcn-style).

This package is **never** an npm runtime dependency. The CLI bundles these `.astro` files into `dist/primitives/` and the scaffold pipeline copies the ones each block needs into `src/components/primitives/` of the generated project. Users own the resulting code and can edit freely.

## Design contract

Every primitive:

- Reads all visual values from palette tokens (`var(--color-primary)`, `var(--radius-md)`, `var(--font-headline)`, `var(--duration-fast)`, `var(--shadow-md)`, …).
- Uses Tailwind utilities for layout/spacing only; never for semantic color.
- Renders zero JS by default; if interaction is required, ships a small inline `<script>` and respects `prefers-reduced-motion`.
- Exposes typed props via the Astro frontmatter `interface Props`.
- Includes accessibility patterns by default (focus rings, ARIA roles, keyboard handling).

## Status

v0.3 skeleton — primitives land in days 4–5 of the v0.3 plan. This package currently ships nothing executable; it's the workspace anchor for the upcoming components.
