---
title: MCP Setup
description: Configure the Model Context Protocol server for AI-powered development.
---

# MCP Setup

Fornix includes a built-in MCP (Model Context Protocol) server that lets AI coding assistants like Claude, Cursor, and Windsurf interact directly with your project.

## Start the Server

```bash
fornix mcp serve
```

The server starts on `stdio` transport by default and exposes tools and resources for project management.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_blocks` | List all available blocks in the registry |
| `add_block` | Add a block to the current project |
| `remove_block` | Remove a block from the project |
| `get_content_schema` | Get the content schema for a block |
| `update_content` | Update content JSON for a block |
| `validate_content` | Validate content against its Zod schema |
| `get_project_status` | Get current project configuration |
| `scaffold_project` | Scaffold a new Fornix project |

## Available Resources

| Resource URI | Description |
|-------------|-------------|
| `fornix://registry` | Full block registry metadata |
| `fornix://project/config` | Current project's `fornix.json` |

## IDE Integration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fornix": {
      "command": "npx",
      "args": ["create-fornix", "mcp", "serve"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fornix": {
      "command": "npx",
      "args": ["create-fornix", "mcp", "serve"]
    }
  }
}
```

## Example Workflow

1. Open your project in an AI-powered editor
2. Ask: "Add a pricing table to my site"
3. The AI calls `add_block` with `pricing-table`
4. Files are placed, dependencies are updated
5. Ask: "Update the pricing content for my SaaS plans"
6. The AI calls `update_content` with your new pricing data
