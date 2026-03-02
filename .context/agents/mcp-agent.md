# MCP Agent

Last verified: 2026-03-03

## Purpose

The MCP (Model Context Protocol) server exposes Fornix's capabilities as tools that AI agents (Claude, Cursor, Copilot, or any MCP-compatible client) can call programmatically.

## Server Setup

```typescript
// Launched via: fornix mcp serve
// Uses: @modelcontextprotocol/sdk
// Transport: StdioServerTransport
```

## Tools

| Tool | Input | Purpose |
|------|-------|---------|
| `list_blocks` | `type?`, `category?`, `search?` | List available blocks from registry |
| `add_block` | `name`, `variant?` | Add a block to current project |
| `remove_block` | `name` | Remove a block |
| `get_content_schema` | `collection` | Get Zod schema for a content collection |
| `update_content` | `collection`, `entry`, `data` | Modify content entries |
| `validate_content` | `collection`, `entry?` | Validate content against schema |
| `get_project_status` | — | Get installed blocks and config |
| `scaffold_project` | `description`, `projectDir` | Full AI pipeline from natural language |

## Resources

| Resource | URI | Purpose |
|----------|-----|---------|
| Registry | `fornix://registry` | Full block registry as JSON |
| Project Config | `fornix://project/config` | Current project configuration |

## Client Configuration

### Claude Desktop (`claude_desktop_config.json`)
```json
{ "mcpServers": { "fornix": { "command": "npx", "args": ["-y", "create-fornix", "mcp", "serve"] } } }
```

### Cursor (`.cursor/mcp.json`)
```json
{ "mcpServers": { "fornix": { "command": "npx", "args": ["-y", "create-fornix", "mcp", "serve"] } } }
```

## Agent Context Auto-Generation

During scaffold, Fornix auto-generates project-specific context files:

- **`CLAUDE.md`** — project architecture, installed blocks, content collections, CLI commands
- **`.cursor/rules/`** — same info in Cursor format

These tell any AI agent exactly how the project works, what blocks are installed, and how to manage content (edit JSON files, not `.astro` components).
