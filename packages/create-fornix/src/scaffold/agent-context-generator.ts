import type { BlockManifest } from "fornix-registry";
import type { ResolvedConfig } from "../schemas/config.js";
import type { FileMap } from "./structure-generator.js";

function getI18nInfo(config: ResolvedConfig): string {
  if (config.locales.length >= 2) {
    return `
### i18n
i18n is enabled. The project supports the following locales: \`${config.locales.join(", ")}\` with \`${config.defaultLocale}\` as default.
Content is organized in locale-specific folders under \`src/content/\`:
${config.locales.map((l: string) => `- \`src/content/${l}/\``).join("\n")}
`;
  }
  return `\n### Content\nContent is located under \`src/content/\`.\n`;
}

function getBlocksTable(blocks: ReadonlyArray<BlockManifest>): string {
  if (blocks.length === 0) return "No blocks installed.\n";
  const rows = blocks.map(b => `| \`${b.name}\` | ${b.type} | ${b.description} |`).join("\n");
  return `| Block | Type | Description |\n|-------|------|-------------|\n${rows}\n`;
}

export function generateAgentContext(
  config: ResolvedConfig,
  blocks: ReadonlyArray<BlockManifest>,
): FileMap {
  const i18nSection = getI18nInfo(config);
  const blocksTable = getBlocksTable(blocks);
  
  const content = `# Fornix Project: ${config.projectName}

## Architecture
- **Render Mode:** ${config.renderMode}
- **Deploy Target:** ${config.deployTarget}
- **Database:** ${config.database}
- **CSS Engine:** ${config.cssEngine}
- **Package Manager:** ${config.packageManager}

## Installed Blocks
${blocksTable}
## Content & Locales
${i18nSection}
## CLI Commands
- \`npx create-fornix [dir]\` — scaffold a new project (AI mode default, \`--manual\` for interactive)
- \`fornix add <block>\` / \`fornix remove <block>\` — manage blocks
- \`fornix list\` / \`fornix status\` — inspect registry and project
- \`fornix mcp serve\` — MCP server for AI agent integration

> **Note to AI Agents:** You should respect the Fornix architectural guidelines by updating JSON content for text changes, and interacting via MCP rather than modifying block structures ad hoc.
`;

  const cursorContent = `---
description: Fornix Project Architecture and Context
globs: *
---
${content}
`;

  return {
    "CLAUDE.md": content,
    ".cursor/rules/fornix.mdc": cursorContent,
  };
}
