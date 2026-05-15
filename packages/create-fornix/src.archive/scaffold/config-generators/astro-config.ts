import { parseModule, generateCode, builders } from "magicast";
import type { ResolvedConfig } from "../../schemas/config.js";
import type { BlockManifest } from "fornix-registry";
import { ok, err, type Result } from "../../utils/result.js";

// ── Adapter Map ──────────────────────────────────────────

const ADAPTER_MAP: Record<string, { package: string; identifier: string }> = {
  cloudflare: { package: "@astrojs/cloudflare", identifier: "cloudflare" },
  vercel: { package: "@astrojs/vercel", identifier: "vercel" },
  netlify: { package: "@astrojs/netlify", identifier: "netlify" },
};

// ── Public API ───────────────────────────────────────────

export function generateAstroConfig(
  config: ResolvedConfig,
  blocks: ReadonlyArray<BlockManifest> = [],
): Result<string, Error> {
  try {
    const module = parseModule("export default defineConfig({});");

    module.imports.$add({
      from: "astro/config",
      imported: "defineConfig",
      local: "defineConfig",
    });

    const configObject = module.exports.default.$args[0];

    // Astro v5: only "static" (default) and "server" remain.
    // "hybrid" was removed — static now supports per-page prerender opt-out.
    // Map both "server" and "hybrid" to output: "server".
    if (config.renderMode === "server" || config.renderMode === "hybrid") {
      configObject.output = "server";
    }

    const adapter = ADAPTER_MAP[config.deployTarget];
    if (adapter) {
      module.imports.$add({
        from: adapter.package,
        imported: "default",
        local: adapter.identifier,
      });
      configObject.adapter = builders.functionCall(adapter.identifier);
    }

    if (config.locales.length >= 2) {
      configObject.i18n = {
        defaultLocale: config.defaultLocale,
        locales: config.locales,
        routing: {
          prefixDefaultLocale: false,
        },
      };
    }

    const hasMdx = blocks.some((b) => b.dependencies && b.dependencies["@astrojs/mdx"]);
    if (hasMdx) {
      module.imports.$add({
        from: "@astrojs/mdx",
        imported: "default",
        local: "mdx",
      });
      
      configObject.integrations = configObject.integrations || [];
      configObject.integrations.push(builders.functionCall("mdx"));
    }

    // Tailwind CSS v4 — requires the Vite plugin
    if (config.cssEngine === "tailwind") {
      module.imports.$add({
        from: "@tailwindcss/vite",
        imported: "default",
        local: "tailwindcss",
      });
      configObject.vite = {
        plugins: [builders.functionCall("tailwindcss")],
      };
    }

    const { code } = generateCode(module);
    return ok(code);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to generate astro.config.mjs: ${message}`));
  }
}
