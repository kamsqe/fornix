/**
 * Page Updater — reads and rewrites index.astro / Layout.astro to
 * add/remove block imports with correct semantic ordering.
 *
 * Blocks are placed in three zones:
 *   1. Header zone  — in Layout.astro, before <slot />
 *   2. Content zone — in index.astro, inside <main>
 *   3. Footer zone  — in Layout.astro, after <slot />
 *
 * Content blocks are ordered by category priority so that re-adding a
 * hero always places it above the pricing section, etc.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ── Category → Priority ─────────────────────────────────

/** Lower number = higher on the page. */
const CATEGORY_ORDER: Record<string, number> = {
  header: 0,
  hero: 1,
  features: 2,
  pricing: 3,
  testimonials: 4,
  faq: 5,
  cta: 6,
  contact: 7,
  theme: 8,
  footer: 9,
};

const DEFAULT_PRIORITY = 5;

/** Categories that go in Layout.astro instead of index.astro. */
export const LAYOUT_CATEGORIES = new Set(["header", "footer"]);

// ── Helpers ──────────────────────────────────────────────

/**
 * Derives a PascalCase component name from a kebab-case block name.
 * e.g. "hero-gradient" → "HeroGradient"
 */
export function blockNameToComponentName(blockName: string): string {
  return blockName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Derives the import path used in index.astro for a section block.
 * e.g. "hero-gradient" → "../components/sections/hero-gradient.astro"
 */
export function blockNameToImportPath(blockName: string): string {
  return `../components/sections/${blockName}.astro`;
}

/**
 * Derives the import path used in Layout.astro for header/footer blocks.
 * e.g. "header-sticky" → "../components/sections/header-sticky.astro"
 */
export function blockNameToLayoutImportPath(blockName: string): string {
  return `../components/sections/${blockName}.astro`;
}

/**
 * Looks up the category of a block from fornix.json in the project dir.
 * Falls back to guessing from the block name prefix.
 */
export function getBlockCategory(blockName: string, projectDir?: string): string {
  // Try reading from fornix.json
  if (projectDir) {
    try {
      const fornixPath = join(projectDir, "fornix.json");
      if (existsSync(fornixPath)) {
        const fornix = JSON.parse(readFileSync(fornixPath, "utf-8"));
        const block = fornix.blocks?.find((b: { name: string }) => b.name === blockName);
        if (block?.category) return block.category;
      }
    } catch { /* fall through to prefix guessing */ }
  }

  // Guess from name prefix
  for (const prefix of Object.keys(CATEGORY_ORDER)) {
    if (blockName.startsWith(prefix)) return prefix;
  }
  return "other";
}

function getPriority(category: string): number {
  return CATEGORY_ORDER[category] ?? DEFAULT_PRIORITY;
}

/**
 * Returns true if the block goes in Layout.astro (header/footer),
 * false if it goes in index.astro (content blocks).
 */
export function isLayoutBlock(blockName: string, projectDir?: string): boolean {
  const category = getBlockCategory(blockName, projectDir);
  return LAYOUT_CATEGORIES.has(category);
}

// ── Add Block to Page (index.astro — content zone) ──────

/**
 * Adds an import and component tag for a content block to index.astro,
 * inserted at the correct position based on category priority.
 * Returns the updated file content, or the original if already present.
 */
export function addBlockToPage(
  pageContent: string,
  blockName: string,
  projectDir?: string,
): string {
  const componentName = blockNameToComponentName(blockName);
  const importPath = blockNameToImportPath(blockName);

  // Skip if already imported
  if (pageContent.includes(importPath) || pageContent.includes(`import ${componentName}`)) {
    return pageContent;
  }

  const importLine = `import ${componentName} from '${importPath}';`;
  const componentTag = `    <${componentName} />`;
  const newCategory = getBlockCategory(blockName, projectDir);
  const newPriority = getPriority(newCategory);

  // Insert import: find the closing --- of the frontmatter and add before it
  const frontmatterEnd = pageContent.indexOf("---", pageContent.indexOf("---") + 3);
  if (frontmatterEnd === -1) {
    return pageContent;
  }
  let updated = pageContent.slice(0, frontmatterEnd) + importLine + "\n" + pageContent.slice(frontmatterEnd);

  // Find insertion point for the component tag based on priority.
  // Scan existing component tags between <main> and </main>.
  const mainOpenMatch = updated.match(/<main[^>]*>/);
  const mainCloseIndex = updated.lastIndexOf("</main>");
  if (!mainOpenMatch || mainCloseIndex === -1) {
    return updated;
  }

  const mainOpenEnd = mainOpenMatch.index! + mainOpenMatch[0].length;
  const mainContent = updated.slice(mainOpenEnd, mainCloseIndex);

  // Parse existing tags and their priorities
  const tagPattern = /^(\s*<([A-Z][A-Za-z]*)\s*\/>)\s*$/gm;
  let insertOffset = mainCloseIndex; // default: before </main>
  let match;

  while ((match = tagPattern.exec(mainContent)) !== null) {
    const existingComponentName = match[2];
    const existingBlockName = componentNameToBlockName(existingComponentName);
    const existingCategory = getBlockCategory(existingBlockName, projectDir);
    const existingPriority = getPriority(existingCategory);

    if (existingPriority > newPriority) {
      // Insert before this tag
      insertOffset = mainOpenEnd + match.index!;
      break;
    }
  }

  updated = updated.slice(0, insertOffset) + componentTag + "\n" + updated.slice(insertOffset);

  return updated;
}

// ── Add Block to Layout (Layout.astro — header/footer zone) ──

/**
 * Adds an import and component tag for a header or footer block to Layout.astro.
 * Headers go before <slot />, footers go after <slot />.
 */
export function addBlockToLayout(
  layoutContent: string,
  blockName: string,
  projectDir?: string,
): string {
  const componentName = blockNameToComponentName(blockName);
  const importPath = blockNameToLayoutImportPath(blockName);

  // Skip if already imported
  if (layoutContent.includes(importPath) || layoutContent.includes(`import ${componentName}`)) {
    return layoutContent;
  }

  const importLine = `import ${componentName} from '${importPath}';`;
  const componentTag = `    <${componentName} />`;
  const category = getBlockCategory(blockName, projectDir);

  // Insert import before closing ---
  const frontmatterEnd = layoutContent.indexOf("---", layoutContent.indexOf("---") + 3);
  if (frontmatterEnd === -1) {
    return layoutContent;
  }
  let updated = layoutContent.slice(0, frontmatterEnd) + importLine + "\n" + layoutContent.slice(frontmatterEnd);

  // Insert tag in correct zone
  if (category === "header") {
    // Insert before <main> or <slot />
    const slotIndex = updated.indexOf("<slot");
    const mainIndex = updated.indexOf("<main");
    const insertBefore = mainIndex !== -1 ? mainIndex : slotIndex;
    if (insertBefore !== -1) {
      updated = updated.slice(0, insertBefore) + componentTag + "\n" + updated.slice(insertBefore);
    }
  } else if (category === "footer") {
    // Insert after </main> or after <slot />
    const mainCloseIndex = updated.indexOf("</main>");
    const slotMatch = updated.match(/<slot\s*\/>/);
    if (mainCloseIndex !== -1) {
      const afterMain = mainCloseIndex + "</main>".length;
      updated = updated.slice(0, afterMain) + "\n" + componentTag + updated.slice(afterMain);
    } else if (slotMatch) {
      const afterSlot = slotMatch.index! + slotMatch[0].length;
      updated = updated.slice(0, afterSlot) + "\n" + componentTag + updated.slice(afterSlot);
    }
  }

  return updated;
}

// ── Remove Block from Page ───────────────────────────────

/**
 * Removes the import and component tag for a section block from file content.
 * Works for both index.astro and Layout.astro (regex-based, zone-agnostic).
 */
export function removeBlockFromPage(
  pageContent: string,
  blockName: string,
): string {
  const componentName = blockNameToComponentName(blockName);
  const importPath = blockNameToImportPath(blockName);

  let updated = pageContent;

  // Remove import line
  const importRegex = new RegExp(
    `^\\s*import\\s+${componentName}\\s+from\\s+['"]${escapeRegex(importPath)}['"];?\\s*\\n?`,
    "m",
  );
  updated = updated.replace(importRegex, "");

  // Remove component tag
  const tagRegex = new RegExp(
    `^\\s*<${componentName}\\s*/?>\\s*\\n?`,
    "m",
  );
  updated = updated.replace(tagRegex, "");

  return updated;
}

// ── Internal ─────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reverse of blockNameToComponentName: "HeroGradient" → "hero-gradient"
 */
function componentNameToBlockName(componentName: string): string {
  return componentName
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}
