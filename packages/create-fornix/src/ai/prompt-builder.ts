/**
 * System Prompt Builder
 *
 * Builds a dynamic system prompt from the block registry for the AI engine.
 * Includes all blocks with metadata, palette names, and constraint rules.
 */

import type { BlockManifest, Palette } from "fornix-registry";

// ── Types ────────────────────────────────────────────────

export interface BlockRegistry {
  readonly blocks: Readonly<Record<string, BlockManifest>>;
  readonly palettes: ReadonlyArray<Palette>;
}

// ── Public API ───────────────────────────────────────────

/**
 * Build the system prompt from the registry.
 * This prompt is injected as the system message for the AI engine.
 */
export function buildSystemPrompt(registry: BlockRegistry): string {
  const sections: string[] = [
    buildIdentity(),
    buildBlocksCatalog(registry.blocks),
    buildPalettesCatalog(registry.palettes),
    buildConstraintRules(registry.blocks),
    buildOutputInstructions(),
  ];

  return sections.join("\n\n");
}

// ── Sections ─────────────────────────────────────────────

function buildIdentity(): string {
  return `# Fornix AI Assistant

You are the Fornix AI assistant. You analyze user descriptions of websites and produce structured configuration for the Fornix scaffold engine.

Your job:
1. Understand what the user wants to build
2. Select appropriate blocks from the available catalog
3. Choose a palette that fits the brand and industry
4. Determine the correct render mode, deploy target, and other settings
5. Generate content for each block's content slots

You MUST only select blocks that exist in the catalog below. Never invent block names.`;
}

function buildBlocksCatalog(
  blocksRecord: Readonly<Record<string, BlockManifest>>,
): string {
  const blocks = Object.values(blocksRecord);
  const lines: string[] = ["# Available Blocks\n"];

  // Group by type
  const grouped = new Map<string, BlockManifest[]>();
  for (const block of blocks) {
    if (!grouped.has(block.type)) {
      grouped.set(block.type, []);
    }
    grouped.get(block.type)!.push(block);
  }

  for (const [type, typeBlocks] of grouped) {
    lines.push(`## ${type.toUpperCase()} Blocks\n`);

    for (const block of typeBlocks) {
      lines.push(`### ${block.name}`);
      lines.push(`- **Description:** ${block.description}`);
      lines.push(`- **Category:** ${block.category}`);
      lines.push(`- **Tags:** ${block.tags.join(", ") || "none"}`);

      if (block.ai) {
        lines.push(`- **When to use:** ${block.ai.whenToUse}`);
        lines.push(`- **When NOT to use:** ${block.ai.whenNotToUse}`);
        if (block.ai.pairsWith.length > 0) {
          lines.push(
            `- **Pairs with:** ${block.ai.pairsWith.join(", ")}`,
          );
        }
        if (block.ai.contentSlots && Object.keys(block.ai.contentSlots).length > 0) {
          lines.push(`- **Content slots:**`);
          for (const [slotName, slot] of Object.entries(
            block.ai.contentSlots,
          )) {
            const desc = slot.description ? ` — ${slot.description}` : "";
            const maxLen = slot.maxLength
              ? ` (max ${slot.maxLength} chars)`
              : "";
            lines.push(`  - \`${slotName}\` (${slot.type})${desc}${maxLen}`);
          }
        }
      }

      if (block.requires.length > 0) {
        lines.push(`- **Requires:** ${block.requires.join(", ")}`);
      }
      if (block.conflicts.length > 0) {
        lines.push(`- **Conflicts with:** ${block.conflicts.join(", ")}`);
      }
      if (block.requiredMode) {
        lines.push(`- **Required mode:** ${block.requiredMode}`);
      }
      if (Object.keys(block.dependencies).length > 0) {
        lines.push(
          `- **npm deps:** ${Object.keys(block.dependencies).join(", ")}`,
        );
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildPalettesCatalog(
  palettes: ReadonlyArray<Palette>,
): string {
  const lines: string[] = ["# Available Palettes\n"];
  lines.push(
    "Select a palette that fits the brand, industry, and visual style.\n",
  );

  // Group by category
  const grouped = new Map<string, Palette[]>();
  for (const palette of palettes) {
    if (!grouped.has(palette.category)) {
      grouped.set(palette.category, []);
    }
    grouped.get(palette.category)!.push(palette);
  }

  for (const [category, categoryPalettes] of grouped) {
    const names = categoryPalettes
      .map(
        (p) =>
          `${p.displayName} (${p.mode})`,
      )
      .join(", ");
    lines.push(`- **${category}:** ${names}`);
  }

  lines.push("");
  lines.push("Palette names (use these exact values):");
  for (const palette of palettes) {
    lines.push(`- \`${palette.name}\` — ${palette.displayName} (${palette.category}, ${palette.mode})`);
  }

  return lines.join("\n");
}

function buildConstraintRules(
  blocksRecord: Readonly<Record<string, BlockManifest>>,
): string {
  const blocks = Object.values(blocksRecord);
  const lines: string[] = ["# Constraint Rules\n"];

  lines.push("## Render Modes");
  lines.push("- `static` — Pre-rendered HTML, no server. Best for blogs, docs, landing pages.");
  lines.push("- `hybrid` — Mix of static + server routes. Best for mostly-static sites with some dynamic features.");
  lines.push("- `server` — Full server rendering. Required for auth, databases, real-time features.\n");

  // Collect server-required blocks
  const serverBlocks = blocks.filter((b) => b.requiredMode === "server");
  if (serverBlocks.length > 0) {
    lines.push("## Server-Required Blocks");
    lines.push(
      "These blocks REQUIRE `renderMode: 'server'`. Selecting them with static mode is invalid:",
    );
    for (const block of serverBlocks) {
      lines.push(`- \`${block.name}\` (${block.requiredMode})`);
    }
    lines.push("");
  }

  // Collect dependency chains
  const blocksWithDeps = blocks.filter((b) => b.requires.length > 0);
  if (blocksWithDeps.length > 0) {
    lines.push("## Block Dependencies");
    lines.push(
      "These blocks require other blocks to be included:",
    );
    for (const block of blocksWithDeps) {
      lines.push(
        `- \`${block.name}\` requires: ${block.requires.map((r) => `\`${r}\``).join(", ")}`,
      );
    }
    lines.push("");
  }

  // Collect conflicts
  const blocksWithConflicts = blocks.filter(
    (b) => b.conflicts.length > 0,
  );
  if (blocksWithConflicts.length > 0) {
    lines.push("## Block Conflicts");
    lines.push(
      "These blocks cannot be used together:",
    );
    for (const block of blocksWithConflicts) {
      lines.push(
        `- \`${block.name}\` conflicts with: ${block.conflicts.map((c) => `\`${c}\``).join(", ")}`,
      );
    }
    lines.push("");
  }

  lines.push("## Deterministic Rules (applied automatically)");
  lines.push("The following rules are applied by the rules engine BEFORE your output:");
  lines.push("- Auth or user accounts → `renderMode: server`, `auth-better-auth` + `db-d1` auto-added");
  lines.push("- Payments or e-commerce → upgrade to `hybrid` if static, `payments-stripe` auto-added");
  lines.push("- Blog with no dynamic content → `renderMode: static`, `blog-mdx` auto-added");
  lines.push("- Cloudflare deploy target → `analytics-cf` auto-added");
  lines.push("- Multiple languages → i18n mode enabled, locales set");
  lines.push("- Theme switcher requested → `theme-switcher` block auto-added");
  lines.push("\nDo NOT include auto-added blocks in your recommendations. Focus on section and feature blocks.");

  return lines.join("\n");
}

function buildOutputInstructions(): string {
  return `# Output Instructions

Return a structured IntentSchema object with these fields:
- \`siteType\`: One of: landing-page, saas, agency, portfolio, blog, docs, ecommerce, dashboard, community, other
- \`industry\`: The industry or niche
- \`brand\`: { name, tagline?, description, targetAudience?, tone }
- Boolean signals: needsAuth, needsPayments, needsBlog, needsDocs, needsDashboard, needsContactForm, needsNewsletter, hasDynamicContent, hasEcommerce, hasUserAccounts
- \`prefersDarkMode\`: Whether the user prefers dark mode
- \`visualStyle\`: One of: minimal, bold, glassmorphism, gradient, flat, neo-brutalist
- \`languages\`: Array of language codes (e.g. ['en', 'ar'])
- \`palettePreference\`: One of: custom, prebuilt, ai-generated, unspecified
- \`wantsThemeSwitcher\`: Whether the user wants theme switching
- \`recommendedBlocks\`: Array of { blockName, reason, confidence (0-1) }
- \`uncertainties\`: Array of { topic, question, defaultAssumption }
- \`overallConfidence\`: 0-1 score

ONLY recommend blocks that exist in the catalog above. Be precise with block names.`;
}
