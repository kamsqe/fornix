/**
 * Hardcoded fixture manifests for the flag-driven scaffold.
 * This will be replaced by a real registry loader in a later phase.
 */

import type { BlockManifest, Palette } from "fornix-registry";
import type { BlockSourceMap } from "../scaffold/block-placer.js";
import type { BlockDefaultContent } from "../scaffold/content-wiring.js";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Block Manifests ─────────────────────────────────────

function manifest(
  name: string,
  overrides: Partial<BlockManifest> = {},
): BlockManifest {
  return {
    schemaVersion: 1,
    name,
    version: "1.0.0",
    type: "section",
    description: `Block ${name}`,
    category: "general",
    tags: [],
    dependencies: {},
    requires: [],
    conflicts: [],
    envVars: [],
    variants: ["default"],
    slots: [],
    files: [
      {
        source: `${name}.astro`,
        destination: `src/components/sections/${name}.astro`,
      },
    ],
    ...overrides,
  };
}

export const FIXTURE_MANIFESTS: Record<string, BlockManifest> = {
  "hero-gradient": manifest("hero-gradient", {
    category: "hero",
    ai: {
      whenToUse: "Landing page hero with gradient background",
      whenNotToUse: "Internal pages",
      pairsWith: ["cta-simple", "features-grid"],
      contentSlots: {
        headline: { type: "string", description: "Main headline" },
        subheadline: { type: "string", description: "Sub headline" },
      },
    },
  }),
  "footer-minimal": manifest("footer-minimal", {
    category: "footer",
  }),
  "cta-simple": manifest("cta-simple", {
    category: "cta",
  }),
  "features-grid": manifest("features-grid", {
    category: "features",
  }),
  "auth-better-auth": manifest("auth-better-auth", {
    type: "integration",
    category: "auth",
    requiredMode: "server",
    requires: ["db-d1"],
    dependencies: {
      "better-auth": "^1.2.0",
    },
    envVars: [
      { name: "AUTH_SECRET", description: "Auth secret key", required: true },
      { name: "GITHUB_CLIENT_ID", description: "GitHub OAuth client ID", required: true },
      { name: "GITHUB_CLIENT_SECRET", description: "GitHub OAuth client secret", required: true },
    ],
    files: [
      { source: "auth.ts", destination: "src/lib/auth.ts" },
      { source: "middleware.ts", destination: "src/middleware/auth.ts" },
      { source: "auth-api.ts", destination: "src/pages/api/auth/[...all].ts" },
      { source: "login.astro", destination: "src/pages/login.astro" },
      { source: "signup.astro", destination: "src/pages/signup.astro" },
    ],
  }),
  "db-d1": manifest("db-d1", {
    type: "integration",
    category: "database",
    requiredMode: "server",
    dependencies: {
      "drizzle-orm": "^0.38.0",
      "drizzle-kit": "^0.30.0",
    },
    envVars: [
      { name: "D1_DATABASE_ID", description: "Cloudflare D1 database ID", required: true },
    ],
    files: [
      { source: "db.ts", destination: "src/lib/db.ts" },
      { source: "schema.ts", destination: "src/lib/db-schema.ts" },
      { source: "drizzle.config.ts", destination: "drizzle.config.ts" },
      { source: "migrations/.gitkeep", destination: "drizzle/migrations/.gitkeep" },
    ],
  }),
};

// ── Block Sources (stub file contents) ──────────────────

export const FIXTURE_BLOCK_SOURCES: BlockSourceMap = {
  "hero-gradient": {
    "hero-gradient.astro": `---
interface Props {
  headline?: string;
  subheadline?: string;
}
const { headline = "Welcome", subheadline = "" } = Astro.props;
---
<section class="hero-gradient">
  <h1>{headline}</h1>
  {subheadline && <p>{subheadline}</p>}
</section>
`,
  },
  "footer-minimal": {
    "footer-minimal.astro": `<footer class="footer-minimal">
  <p>&copy; {new Date().getFullYear()}</p>
</footer>
`,
  },
  "cta-simple": {
    "cta-simple.astro": `<section class="cta-simple">
  <h2>Get Started</h2>
  <a href="#" class="btn">Start Now</a>
</section>
`,
  },
  "features-grid": {
    "features-grid.astro": `<section class="features-grid">
  <h2>Features</h2>
  <div class="grid"></div>
</section>
`,
  },
  "auth-better-auth": {
    "auth.ts": `import { betterAuth } from "better-auth";
import { getDb } from "./db";

export function createAuth(d1: D1Database) {
  const db = getDb(d1);
  return betterAuth({
    database: db,
    secret: import.meta.env.AUTH_SECRET,
    emailAndPassword: { enabled: true },
    socialProviders: {
      github: {
        clientId: import.meta.env.GITHUB_CLIENT_ID,
        clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
      },
    },
  });
}
`,
    "middleware.ts": `import type { MiddlewareHandler } from "astro";
import { createAuth } from "../lib/auth";

export const authMiddleware: MiddlewareHandler = async (context, next) => {
  return next();
};
`,
    "auth-api.ts": `import type { APIRoute } from "astro";
import { createAuth } from "../../lib/auth";

export const ALL: APIRoute = async (context) => {
  const d1 = (context.locals as Record<string, { env: { DB: D1Database } }>).runtime.env.DB;
  const auth = createAuth(d1);
  return auth.handler(context.request);
};
`,
    "login.astro": `---\nimport { getEntry } from "astro:content";\nconst entry = await getEntry("sections", "auth-login");\n---\n<main class="auth-page"><h1>Login</h1></main>\n`,
    "signup.astro": `---\nimport { getEntry } from "astro:content";\nconst entry = await getEntry("sections", "auth-signup");\n---\n<main class="auth-page"><h1>Sign Up</h1></main>\n`,
  },
  "db-d1": {
    "db.ts": `import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db-schema";

export type Database = ReturnType<typeof drizzle>;

export function getDb(d1: D1Database): Database {
  return drizzle(d1, { schema });
}
`,
    "schema.ts": `// Database schema — define your tables here.
// See: https://orm.drizzle.team/docs/sql-schema-declaration
`,
    "drizzle.config.ts": `import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db-schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
} satisfies Config;
`,
    "migrations/.gitkeep": "",
  },
};

// ── Block Default Content ───────────────────────────────

export const FIXTURE_DEFAULT_CONTENT: BlockDefaultContent = {};

// ── Palette Loader ──────────────────────────────────────

/**
 * Loads all palette JSON files from the fornix-registry palettes/ directory.
 * Falls back to an empty array if the directory isn't found.
 */
export function loadAllPalettes(): Palette[] {
  try {
    // Resolve the palettes directory relative to the fornix-registry package
    const registryPath = findRegistryPalettesDir();
    if (!registryPath) return [];

    const files = readdirSync(registryPath).filter((f) => f.endsWith(".json"));
    const palettes: Palette[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(registryPath, file), "utf-8");
        palettes.push(JSON.parse(content) as Palette);
      } catch {
        // Skip malformed palette files
      }
    }

    return palettes;
  } catch {
    return [];
  }
}

function findRegistryPalettesDir(): string | null {
  try {
    // Try to resolve from the fornix-registry package
    const thisDir = dirname(fileURLToPath(import.meta.url));
    // Walk up to find the monorepo root, then into fornix-registry
    const monorepoRoot = join(thisDir, "..", "..", "..");
    const palettesDir = join(monorepoRoot, "packages", "fornix-registry", "palettes");
    readdirSync(palettesDir); // Throws if not found
    return palettesDir;
  } catch {
    return null;
  }
}
