/**
 * Project Name Validation — ensures project names are valid npm package names.
 *
 * Rules:
 *  - Lowercase only
 *  - No spaces or special characters (except hyphens)
 *  - Cannot start with a dot, hyphen, or number
 *  - Must be non-empty
 */

import { ok, err, type Result } from "./result.js";

const VALID_NAME_RE = /^[a-z][a-z0-9-]*$/;

/**
 * Validate that a project name is a valid npm-style package name.
 */
export function validateProjectName(name: string): Result<string, string> {
  if (!name || name.length === 0) {
    return err("Project name cannot be empty.");
  }

  if (!VALID_NAME_RE.test(name)) {
    const suggestion = suggestProjectName(name);
    return err(
      `"${name}" is not a valid project name. Try: "${suggestion}" instead.`,
    );
  }

  return ok(name);
}

/**
 * Sanitize an invalid project name into a valid one.
 */
export function suggestProjectName(invalid: string): string {
  let name = invalid
    .toLowerCase()
    .replace(/[_\s]+/g, "-")       // underscores and spaces → hyphens
    .replace(/[^a-z0-9-]/g, "")    // strip everything except a-z, 0-9, hyphens
    .replace(/-{2,}/g, "-")        // collapse multiple hyphens
    .replace(/^[-.]/, "")          // strip leading dot or hyphen
    .replace(/-$/, "");            // strip trailing hyphen

  if (!name || name.length === 0 || !/^[a-z]/.test(name)) {
    return "my-project";
  }

  return name;
}
