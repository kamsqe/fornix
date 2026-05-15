import { ok, err } from "../../utils/result.js";
import type {
  AIProvider,
  CopyRequest,
  CopyResponse,
} from "../provider.js";

/**
 * Deterministic provider for tests.
 *
 * Construct with a map from `blockName` (per-locale, optionally) to the
 * exact response payload you want the provider to return. Anything not in
 * the map yields a `ProviderError` so missing-mock cases are obvious.
 */
export function createMockProvider(
  responses: Record<string, CopyResponse | Error>,
): AIProvider {
  return {
    name: "mock",
    async generateBlockCopy(request: CopyRequest) {
      const key = `${request.blockName}:${request.locale}`;
      const localized = responses[key];
      const generic = responses[request.blockName];
      const match = localized ?? generic;

      if (match === undefined) {
        return err({
          kind: "ProviderError",
          provider: "mock",
          message: `No mock response configured for "${request.blockName}" (locale "${request.locale}"). Add it under the key "${request.blockName}" or "${key}".`,
        });
      }

      if (match instanceof Error) {
        return err({
          kind: "ProviderError",
          provider: "mock",
          message: match.message,
        });
      }

      return ok(match);
    },
  };
}
