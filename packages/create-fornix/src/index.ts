/**
 * v2 public entry.
 *
 * Surface stays narrow on purpose: programmatic `scaffoldProject(config, opts)`
 * plus the AI provider seam. The CLI (`dist/cli.js`) is a separate binary,
 * not exposed through this entry.
 */
export {
  scaffoldProject,
  type ScaffoldResult,
  type ScaffoldOptions,
} from "./scaffold/scaffold-project.js";

export type {
  AIProvider,
  BrandContext,
  CopyRequest,
  CopyResponse,
} from "./ai/provider.js";
export { createMockProvider } from "./ai/providers/mock.js";
export type { GeneratedCopyEntry } from "./ai/generate-copy.js";

export type { ResolvedConfig } from "./schemas/config.js";
export type { Result } from "./utils/result.js";
