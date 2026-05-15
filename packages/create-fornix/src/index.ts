/**
 * v2 spine — public entry.
 *
 * Day 1 surface: programmatic `scaffoldProject(config)` only.
 * The CLI command surface (citty-based) gets wired in once the spine e2e
 * test is green.
 */
export { scaffoldProject } from "./scaffold/scaffold-project.js";
export type { ScaffoldResult } from "./scaffold/scaffold-project.js";

export type { ResolvedConfig } from "./schemas/config.js";
export type { Result } from "./utils/result.js";
