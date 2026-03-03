# create-fornix

CLI-first Astro + Cloudflare project generator with AI-powered scaffolding.

```bash
npx create-fornix my-site
```

See the [main README](../../README.md) for full documentation.

## Usage

```bash
# AI mode (default)
npx create-fornix my-site

# Recipe mode
npx create-fornix my-site --recipe saas --yes

# Manual mode
npx create-fornix my-site --manual

# Add/remove blocks
fornix add pricing-table
fornix remove pricing-table

# Project health
fornix doctor
fornix status

# MCP server
fornix mcp serve
```

## License

MIT
