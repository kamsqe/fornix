# fornix-archetypes

Pre-authored archetypes for `create-fornix`. Each archetype declares:

- **`palette`** — which of the 7 design themes (obsidian, paper, fraktur, ember, terracotta, sage, aurora) drives the site's typography, radius, motion, and shadow tokens.
- **`site`** — partial `SiteConfig` (brand name, tagline, nav, primary CTA, social handles, legal pointers). Merged onto the project's auto-derived defaults.
- **`pages`** — array of `{ slug, title, description, blocks[] }` declaring the routed pages and their composed sections.
- **`content`** — per-block content overrides keyed by block name. Replaces the block's `default-content.json` defaults for this archetype only.

## Why archetypes are data, not code

Every archetype is a single JSON file. The pipeline reads it, merges into `ResolvedConfig`, and the rest of the scaffold runs unchanged. Adding a new archetype = writing one JSON file with realistic content. Modifying an archetype = editing its JSON; users see the change on their next scaffold.

## v0.3 launch set

| Archetype | Palette | Pages | Vibe |
|---|---|---|---|
| `saas` | obsidian | Home + Pricing + FAQ-anchored | dark, technical, dense |
| `agency` | paper | Home + Work + About + Contact | light, polished, service |
| `portfolio` | fraktur | Home + Projects + Contact | editorial, type-led |
| `gym` | ember | Home + Classes + Pricing + Contact | bold, energetic, local |
| `restaurant` | terracotta | Home + Menu + About + Contact | warm, hospitality, imagery-light |

## Status

v0.3 day 10 — schema + first archetype (saas) shipped. Days 10-11 add the remaining four.
