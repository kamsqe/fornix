/**
 * Hardcoded fixture manifests for the flag-driven scaffold.
 * This will be replaced by a real registry loader in a later phase.
 */

import { BUILTIN_PALETTES, type BlockManifest, type Palette } from "fornix-registry";
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
    conflicts: ["hero-video", "hero-split"],
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
    conflicts: ["footer-rich"],
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
  "blog-mdx": manifest("blog-mdx", {
    type: "feature",
    category: "blog",
    files: [
      { source: "schema.ts", destination: "src/content/blog-schema.ts" },
      { source: "pages/index.astro", destination: "src/pages/blog/index.astro" },
      { source: "pages/[slug].astro", destination: "src/pages/blog/[slug].astro" },
      { source: "pages/rss.xml.ts", destination: "src/pages/rss.xml.ts" }
    ],
  }),
  "docs-collection": manifest("docs-collection", {
    type: "feature",
    category: "docs",
    files: [
      { source: "schema.ts", destination: "src/content/docs-schema.ts" },
      { source: "pages/[...slug].astro", destination: "src/pages/docs/[...slug].astro" }
    ],
  }),
  "layout-marketing": manifest("layout-marketing", {
    type: "layout",
    category: "marketing",
    files: [
      { source: "layout-marketing.astro", destination: "src/layouts/layout-marketing.astro" },
      { source: "default-content.json", destination: "src/content/layouts/layout-marketing.json" }
    ],
    ai: {
      whenToUse: "marketing pages",
      whenNotToUse: "dashboards",
      pairsWith: [],
      contentSlots: {
        headerLinks: { type: "array" },
        footerText: { type: "string" }
      }
    }
  }),
  "layout-docs": manifest("layout-docs", {
    type: "layout",
    category: "docs",
    files: [
      { source: "layout-docs.astro", destination: "src/layouts/layout-docs.astro" },
      { source: "default-content.json", destination: "src/content/layouts/layout-docs.json" }
    ],
    ai: {
      whenToUse: "docs",
      whenNotToUse: "marketing",
      pairsWith: [],
      contentSlots: {
        headerTitle: { type: "string" },
        footerText: { type: "string" }
      }
    }
  }),
  "layout-dashboard": manifest("layout-dashboard", {
    type: "layout",
    category: "dashboard",
    requiredMode: "server",
    requires: ["auth-better-auth"],
    files: [
      { source: "layout-dashboard.astro", destination: "src/layouts/layout-dashboard.astro" },
      { source: "default-content.json", destination: "src/content/layouts/layout-dashboard.json" }
    ],
    ai: {
      whenToUse: "dashboards",
      whenNotToUse: "marketing",
      pairsWith: [],
      contentSlots: {
        sidebarLinks: { type: "array" },
        logoutText: { type: "string" }
      }
    }
  }),
  "hero-video": manifest("hero-video", {
    category: "hero",
    conflicts: ["hero-gradient", "hero-split"],
    files: [
      { source: "hero-video.astro", destination: "src/components/sections/hero-video.astro" },
      { source: "hero-video.css", destination: "src/styles/sections/hero-video.css" },
    ],
    ai: {
      whenToUse: "Hero with background video",
      whenNotToUse: "Static sites",
      pairsWith: [],
      contentSlots: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        ctaText: { type: "string" },
        ctaHref: { type: "string" },
        videoUrl: { type: "string" },
        posterUrl: { type: "string" },
      },
    },
  }),
  "features-bento": manifest("features-bento", {
    category: "features",
    ai: {
      whenToUse: "Feature showcase in bento grid",
      whenNotToUse: "Simple pages",
      pairsWith: [],
      contentSlots: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        items: { type: "array" },
      },
    },
  }),
  "pricing-table": manifest("pricing-table", {
    category: "pricing",
    conflicts: ["pricing-comparison"],
    ai: {
      whenToUse: "Pricing plans display",
      whenNotToUse: "Free products",
      pairsWith: [],
      contentSlots: {
        headline: { type: "string" },
        subheadline: { type: "string" },
        plans: { type: "array" },
      },
    },
  }),
  "faq-accordion": manifest("faq-accordion", {
    category: "faq",
    ai: {
      whenToUse: "Frequently asked questions",
      whenNotToUse: "Simple pages",
      pairsWith: [],
      contentSlots: {
        headline: { type: "string" },
        items: { type: "array" },
      },
    },
  }),
  "footer-rich": manifest("footer-rich", {
    category: "footer",
    conflicts: ["footer-minimal"],
    ai: {
      whenToUse: "Multi-column footer with links",
      whenNotToUse: "Minimal sites",
      pairsWith: [],
      contentSlots: {
        brand: { type: "string" },
        description: { type: "string" },
        columns: { type: "array" },
        copyright: { type: "string" },
      },
    },
  }),
  "testimonials-carousel": manifest("testimonials-carousel"),
  "contact-form": manifest("contact-form"),
  "hero-split": manifest("hero-split", {
    category: "hero",
    conflicts: ["hero-gradient", "hero-video"],
  }),
  "header-transparent": manifest("header-transparent", {
    category: "header",
    conflicts: ["header-sticky"],
  }),
  "cta-newsletter": manifest("cta-newsletter"),
  "header-sticky": manifest("header-sticky", {
    category: "header",
    conflicts: ["header-transparent"],
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
    "auth.ts": `import { getDb } from "./db";

type D1Database = any;

export function createAuth(d1: D1Database) {
  const db = getDb(d1);
  return { handler: (req: Request) => new Response("auth") };
}
`,
    "middleware.ts": `import type { MiddlewareHandler } from "astro";
import { createAuth } from "../lib/auth";

export const authMiddleware: MiddlewareHandler = async (context, next) => {
  return next();
};
`,
    "auth-api.ts": `import type { APIRoute } from "astro";
import { createAuth } from "../../../lib/auth";

export const ALL: APIRoute = async (context) => {
  const d1 = (context.locals as Record<string, { env: { DB: any } }>).runtime.env.DB;
  const auth = createAuth(d1);
  return auth.handler(context.request);
};
`,
    "login.astro": `---\n---\n<main class="auth-page"><h1>Login</h1></main>\n`,
    "signup.astro": `---\n---\n<main class="auth-page"><h1>Sign Up</h1></main>\n`,
  },
  "db-d1": {
    "db.ts": `import * as schema from "./db-schema";

export type Database = any;

export function getDb(d1: any): Database {
  return schema;
}
`,
    "schema.ts": `// Database schema — define your tables here.
// See: https://orm.drizzle.team/docs/sql-schema-declaration
export const users = {};
`,
    "drizzle.config.ts": `export default {
  schema: "./src/lib/db-schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
} as any;
`,
    "migrations/.gitkeep": "",
  },
  "blog-mdx": {
    "schema.ts": `import { z, defineCollection } from "astro:content";\nexport const blog = defineCollection({ schema: z.any() });\n`,
    "pages/index.astro": `---
---
<h1>Blog</h1>`,
    "pages/[slug].astro": `---
export function getStaticPaths() { return [{ params: { slug: '1' } }]; }
---
<h1>Post</h1>`,
    "pages/rss.xml.ts": `export const GET = () => new Response("RSS");`
  },
  "docs-collection": {
    "schema.ts": `import { z, defineCollection } from "astro:content";\nexport const docs = defineCollection({ schema: z.any() });\n`,
    "pages/[...slug].astro": `---
export function getStaticPaths() { return [{ params: { slug: '1' } }]; }
---
<h1>Docs</h1>`
  },
  "layout-marketing": {
    "layout-marketing.astro": `---
---
<slot />`,
    "default-content.json": `{ "headerLinks": [], "footerText": "" }`
  },
  "layout-docs": {
    "layout-docs.astro": `---
---
<slot />`,
    "default-content.json": `{ "headerTitle": "", "footerText": "" }`
  },
  "layout-dashboard": {
    "layout-dashboard.astro": `---
---
<slot />`,
    "default-content.json": `{ "sidebarLinks": [], "logoutText": "" }`
  },
  "hero-video": {
    "hero-video.astro": "<section>Hero Video</section>\n",
    "hero-video.css": ".hero-video { min-height: 80vh; }\n",
    "default-content.json": '{"headline":"Experience the Future","subheadline":"Immersive experiences.","ctaText":"Get Started","ctaHref":"#","videoUrl":"","posterUrl":""}',
  },
  "features-bento": {
    "features-bento.astro": "<section>Features Bento</section>\n",
    "features-bento.css": ".features-bento { padding: 4rem 2rem; }\n",
    "default-content.json": '{"headline":"Features","subheadline":"Everything you need.","items":[{"title":"Fast","description":"Lightning speed."}]}',
  },
  "pricing-table": {
    "pricing-table.astro": "<section>Pricing</section>\n",
    "pricing-table.css": ".pricing-table { padding: 4rem 2rem; }\n",
    "default-content.json": '{"headline":"Pricing","subheadline":"Simple pricing.","plans":[{"name":"Free","price":"$0","features":["Basic"]}]}',
  },
  "faq-accordion": {
    "faq-accordion.astro": "<section>FAQ</section>\n",
    "faq-accordion.css": ".faq-accordion { padding: 4rem 2rem; }\n",
    "default-content.json": '{"headline":"FAQ","items":[{"question":"How does it work?","answer":"It just works."}]}',
  },
  "footer-rich": {
    "footer-rich.astro": "<section>Footer</section>\n",
    "footer-rich.css": ".footer-rich { padding: 3rem 2rem; }\n",
    "default-content.json": '{"brand":"Acme","description":"Building the future.","columns":[],"copyright":"© 2025"}',
  },
  "testimonials-carousel": { "testimonials-carousel.astro": "<section>Testimonials</section>\n", },
  "contact-form": { "contact-form.astro": "<section>Contact</section>\n", },
  "hero-split": { "hero-split.astro": "<section>Hero Split</section>\n", },
  "header-transparent": { "header-transparent.astro": "<header>Transparent</header>\n", },
  "cta-newsletter": { "cta-newsletter.astro": "<section>CTA</section>\n", },
  "header-sticky": { "header-sticky.astro": "<header>Sticky</header>\n", },
};

// ── Block Default Content ───────────────────────────────

export const FIXTURE_DEFAULT_CONTENT: BlockDefaultContent = {};

// ── Palette Loader ──────────────────────────────────────

/**
 * Loads all palettes from the bundled registry data.
 *
 * Uses BUILTIN_PALETTES (compiled into the bundle at build time) as the
 * primary source. Falls back to reading JSON files from the monorepo
 * palettes/ directory during development.
 */
export function loadAllPalettes(): Palette[] {
  // Primary: use bundled palette data (works in npm-published CLI)
  if (BUILTIN_PALETTES.length > 0) {
    return [...BUILTIN_PALETTES];
  }

  // Fallback: read from monorepo filesystem (development only)
  try {
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
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const monorepoRoot = join(thisDir, "..", "..", "..");
    const palettesDir = join(monorepoRoot, "packages", "fornix-registry", "palettes");
    readdirSync(palettesDir); // Throws if not found
    return palettesDir;
  } catch {
    return null;
  }
}
