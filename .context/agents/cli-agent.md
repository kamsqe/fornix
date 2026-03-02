# CLI Agent

Last verified: 2026-03-03

## Purpose

The CLI is the user-facing entry point. It handles commands, interactive prompts, flag parsing, and error reporting. Built on **citty** (commands) and **@clack/prompts** (interactive UX).

## Commands

| Command | Package | Purpose |
|---------|---------|---------|
| `create-fornix [dir]` | `create-fornix` | Scaffold a new project |
| `fornix add <block>` | `create-fornix` | Add a block to existing project |
| `fornix remove <block>` | `create-fornix` | Remove a block |
| `fornix list` | `create-fornix` | List available blocks from registry |
| `fornix status` | `create-fornix` | Show installed blocks and config |
| `fornix mcp serve` | `create-fornix` | Start MCP server |

Both `create-fornix` and `fornix` are bin entries pointing to the same entry.

## Key Flags

| Flag | Purpose |
|------|---------|
| `--ai` | AI-assisted mode (default) |
| `--manual` | Traditional interactive prompts |
| `--yes` / `-y` | Accept defaults, non-interactive |
| `--render <mode>` | Set render mode directly |
| `--deploy <target>` | Set deploy target directly |
| `--blocks <list>` | Comma-separated block names |
| `--database <type>` | Set database: `none`, `d1`, `turso`, `astro-db`, `postgres` |
| `--css <engine>` | Set CSS engine: `tailwind` (default) or `vanilla` |
| `--locales <list>` | Comma-separated locale codes (e.g. `en,es,ar`) — enables i18n when 2+ |
| `--palette <name>` | Use a pre-built palette by name (e.g. `midnight`, `ocean-breeze`) |
| `--theme-switcher` | Include the theme switcher block for runtime palette swapping |
| `--dry-run` | Show what would be generated without writing |
| `--provider <name>` | Force a specific AI provider |
| `--verbose` / `--debug` | Detailed output |
| `--recipe <name>` | Use a preset recipe (saas, agency, docs) |

Flag-driven mode (`--render static --deploy cloudflare --blocks x,y --yes`) enables scriptable, non-interactive usage and is essential for E2E testing.

## UX Patterns

### Interactive Prompts (@clack/prompts)

Flow: render mode → deploy target → block selection (categorized, searchable) → palette → confirmation summary.

### AI Conversation Flow

Flow: user description → AI analysis → follow-up questions (max 3 rounds) → proposed config summary → accept/modify/regenerate/cancel.

### Error Messages

Errors must be actionable. Never just "Error: failed". Always include:
- What went wrong
- Why it happened (if determinable)
- How to fix it

### No-Provider Fallback

When no AI provider is detected, show a helpful box with setup options (Ollama, API keys) and offer `--manual` mode.

## Dependencies

- **citty** — command definitions and argument parsing
- **@clack/prompts** — beautiful interactive terminal UX
- **picocolors** — terminal coloring (lightweight, no deps)

## Anti-Patterns

- **Never** do filesystem operations in prompt modules — prompts produce a config object, nothing more
- **Never** use `process.exit()` without clean error reporting
- **Never** assume terminal width — use responsive layouts
