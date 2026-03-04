/**
 * Page Updater — reads and rewrites index.astro to add/remove block imports.
 *
 * Used by `add` and `remove` commands so that the page file stays in sync
 * with the installed blocks.
 */

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

// ── Add Block to Page ────────────────────────────────────

/**
 * Adds an import and component tag for a section block to index.astro content.
 * Returns the updated file content, or the original if the block is already present.
 */
export function addBlockToPage(
  pageContent: string,
  blockName: string,
): string {
  const componentName = blockNameToComponentName(blockName);
  const importPath = blockNameToImportPath(blockName);

  // Skip if already imported
  if (pageContent.includes(importPath) || pageContent.includes(`import ${componentName}`)) {
    return pageContent;
  }

  const importLine = `import ${componentName} from '${importPath}';`;
  const componentTag = `    <${componentName} />`;

  // Insert import: find the closing --- of the frontmatter and add before it
  const frontmatterEnd = pageContent.indexOf("---", pageContent.indexOf("---") + 3);
  if (frontmatterEnd === -1) {
    return pageContent;
  }

  // Add import line before the closing ---
  let updated = pageContent.slice(0, frontmatterEnd) + importLine + "\n" + pageContent.slice(frontmatterEnd);

  // Add component tag before </main>
  const mainCloseIndex = updated.lastIndexOf("</main>");
  if (mainCloseIndex !== -1) {
    updated = updated.slice(0, mainCloseIndex) + componentTag + "\n  " + updated.slice(mainCloseIndex);
  }

  return updated;
}

// ── Remove Block from Page ───────────────────────────────

/**
 * Removes the import and component tag for a section block from index.astro content.
 * Returns the updated file content.
 */
export function removeBlockFromPage(
  pageContent: string,
  blockName: string,
): string {
  const componentName = blockNameToComponentName(blockName);
  const importPath = blockNameToImportPath(blockName);

  let updated = pageContent;

  // Remove import line (handles both single and double quotes, with or without semicolons)
  const importRegex = new RegExp(
    `^\\s*import\\s+${componentName}\\s+from\\s+['"]${escapeRegex(importPath)}['"];?\\s*\\n?`,
    "m",
  );
  updated = updated.replace(importRegex, "");

  // Remove component tag (handles any indentation)
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
