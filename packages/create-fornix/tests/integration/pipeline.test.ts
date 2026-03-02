import { describe, it, expect } from "vitest";
import { scaffold, type ScaffoldInput } from "../../src/scaffold/pipeline";
import { isOk } from "../../src/utils/result";
import type { ResolvedConfig } from "../../src/schemas/config";
import type { BlockManifest } from "fornix-registry";
import type { ProjectManifest } from "../../src/schemas/project-manifest";

// ── Fixtures ─────────────────────────────────────────────

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
    category: "test",
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

function baseConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    projectName: "test-project",
    projectDir: "./test-project",
    renderMode: "static",
    deployTarget: "cloudflare",
    database: "none",
    cssEngine: "tailwind",
    packageManager: "pnpm",
    blocks: [
      { name: "hero-gradient", variant: "default" },
      { name: "footer-minimal", variant: "default" },
    ],
    locales: ["en"],
    defaultLocale: "en",
    palette: {
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    },
    themeSwitcher: false,
    createdWith: "ai",
    ...overrides,
  } as ResolvedConfig;
}

const HERO_MANIFEST = manifest("hero-gradient", {
  type: "section",
  files: [
    {
      source: "hero-gradient.astro",
      destination: "src/components/sections/hero-gradient.astro",
    },
  ],
  ai: {
    whenToUse: "Landing page hero",
    whenNotToUse: "Internal pages",
    pairsWith: [],
    contentSlots: {
      headline: { type: "string", description: "Main headline" },
      subheadline: { type: "string", description: "Sub headline" },
    },
  },
});

const FOOTER_MANIFEST = manifest("footer-minimal", {
  type: "section",
  files: [
    {
      source: "footer-minimal.astro",
      destination: "src/components/sections/footer-minimal.astro",
    },
  ],
});

const AUTH_MANIFEST = manifest("auth-better-auth", {
  type: "integration",
  requiredMode: "server",
  requires: ["db-d1"],
  envVars: [
    { name: "AUTH_SECRET", description: "Auth secret key", required: true },
    { name: "GITHUB_CLIENT_ID", description: "GitHub OAuth client ID", required: true },
    { name: "GITHUB_CLIENT_SECRET", description: "GitHub OAuth client secret", required: true },
  ],
  files: [
    {
      source: "middleware.ts",
      destination: "src/middleware/auth.ts",
    },
    {
      source: "auth-api.ts",
      destination: "src/pages/api/auth.ts",
    },
  ],
});

const DB_D1_MANIFEST = manifest("db-d1", {
  type: "integration",
  requiredMode: "server",
  envVars: [
    { name: "D1_DATABASE_ID", description: "Cloudflare D1 database ID", required: true },
  ],
  files: [
    {
      source: "db.ts",
      destination: "src/lib/db.ts",
    },
  ],
});

const ALL_MANIFESTS: Record<string, BlockManifest> = {
  "hero-gradient": HERO_MANIFEST,
  "footer-minimal": FOOTER_MANIFEST,
  "auth-better-auth": AUTH_MANIFEST,
  "db-d1": DB_D1_MANIFEST,
};

const BLOCK_SOURCES: Record<string, Record<string, string>> = {
  "hero-gradient": {
    "hero-gradient.astro": "<section>Hero Gradient</section>\n",
  },
  "footer-minimal": {
    "footer-minimal.astro": "<footer>Footer Minimal</footer>\n",
  },
  "auth-better-auth": {
    "middleware.ts": "export function onRequest() {}\n",
    "auth-api.ts": "export function POST() {}\n",
  },
  "db-d1": {
    "db.ts": "export const database = {};\n",
  },
};

function buildInput(
  configOverrides: Partial<ResolvedConfig> = {},
  inputOverrides: Partial<ScaffoldInput> = {},
): ScaffoldInput {
  return {
    config: baseConfig(configOverrides),
    manifests: ALL_MANIFESTS,
    blockSources: BLOCK_SOURCES,
    blockDefaultContent: {},
    allPalettes: [],
    ...inputOverrides,
  };
}

// ── Tests ─────────────────────────────────────────────────

describe("scaffold", () => {
  // ── static + cloudflare + 2 blocks → complete project structure ──

  it("produces complete project structure for static + cloudflare + 2 blocks", () => {
    const input = buildInput();
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const files = result.value.files;

      // Base structure
      expect(files["package.json"]).toBeDefined();
      expect(files["tsconfig.json"]).toBeDefined();
      expect(files[".gitignore"]).toBeDefined();
      expect(files["src/pages/index.astro"]).toBeDefined();
      expect(files["src/layouts/Layout.astro"]).toBeDefined();

      // Astro config
      expect(files["astro.config.mjs"]).toBeDefined();
      expect(files["astro.config.mjs"]).toContain("defineConfig");
      expect(files["astro.config.mjs"]).toContain("cloudflare");

      // Wrangler (cloudflare target)
      expect(files["wrangler.json"]).toBeDefined();

      // Palette CSS
      expect(files["src/styles/palettes/_current.css"]).toBeDefined();

      // Block files
      expect(files["src/components/sections/hero-gradient.astro"]).toBeDefined();
      expect(files["src/components/sections/footer-minimal.astro"]).toBeDefined();

      // fornix.json
      expect(files["fornix.json"]).toBeDefined();
    }
  });

  // ── server + cloudflare + auth + db → includes wrangler, server output ──

  it("produces server config with auth and db blocks", () => {
    const input = buildInput({
      renderMode: "server",
      database: "d1",
      blocks: [
        { name: "auth-better-auth", variant: "default" },
        { name: "db-d1", variant: "default" },
      ],
    });
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const files = result.value.files;

      // Wrangler config present
      expect(files["wrangler.json"]).toBeDefined();

      // Astro config has server output
      expect(files["astro.config.mjs"]).toContain('"server"');

      // Auth and DB block files placed
      expect(files["src/middleware/auth.ts"]).toBeDefined();
      expect(files["src/pages/api/auth.ts"]).toBeDefined();
      expect(files["src/lib/db.ts"]).toBeDefined();
    }
  });

  // ── 2 locales → i18n structure present ──

  it("produces i18n structure for 2 locales", () => {
    const input = buildInput({
      locales: ["en", "es"],
      defaultLocale: "en",
    });
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const files = result.value.files;

      // i18n utils
      expect(files["src/i18n/utils.ts"]).toBeDefined();
      expect(files["src/i18n/utils.ts"]).toContain("getLocale");

      // Locale-prefixed routes
      expect(files["src/pages/[locale]/index.astro"]).toBeDefined();

      // Astro config has i18n
      expect(files["astro.config.mjs"]).toContain("i18n");

      // Content is locale-prefixed (hero-gradient has contentSlots)
      expect(files["src/content/en/sections/hero-gradient.json"]).toBeDefined();
      expect(files["src/content/es/sections/hero-gradient.json"]).toBeDefined();
    }
  });

  // ── themeSwitcher → palette CSS files present ──

  it("produces palette CSS files when themeSwitcher is true", () => {
    const midnightPalette = {
      schemaVersion: 1,
      name: "midnight",
      displayName: "Midnight",
      category: "dark",
      mode: "dark" as const,
      colors: {
        primary: "#6366f1",
        secondary: "#818cf8",
        accent: "#c084fc",
        background: "#0f172a",
        foreground: "#f8fafc",
      },
    };
    const oceanPalette = {
      schemaVersion: 1,
      name: "ocean-breeze",
      displayName: "Ocean Breeze",
      category: "cool",
      mode: "dark" as const,
      colors: {
        primary: "#0ea5e9",
        secondary: "#38bdf8",
        accent: "#7dd3fc",
        background: "#0c4a6e",
        foreground: "#f0f9ff",
      },
    };

    const input = buildInput(
      {
        themeSwitcher: true,
        palette: {
          preset: "midnight",
          colors: midnightPalette.colors,
        },
      },
      { allPalettes: [midnightPalette, oceanPalette] },
    );
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const files = result.value.files;

      expect(files["src/styles/palettes/_current.css"]).toBeDefined();
      expect(files["src/styles/palettes/midnight.css"]).toBeDefined();
      expect(files["src/styles/palettes/ocean-breeze.css"]).toBeDefined();
    }
  });

  // ── fornix.json written and valid ──

  it("writes valid fornix.json", () => {
    const input = buildInput();
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const fornixJson = result.value.files["fornix.json"];
      expect(fornixJson).toBeDefined();

      const parsed: ProjectManifest = JSON.parse(fornixJson);
      expect(parsed.version).toBeDefined();
      expect(parsed.createdWith).toBe("ai");
      expect(parsed.renderMode).toBe("static");
      expect(parsed.deployTarget).toBe("cloudflare");
      expect(parsed.locales).toEqual(["en"]);
      expect(parsed.defaultLocale).toBe("en");
      expect(parsed.palette).toBeDefined();
      expect(parsed.blocks).toHaveLength(2);
      expect(parsed.blocks[0].name).toBe("hero-gradient");
      expect(parsed.blocks[1].name).toBe("footer-minimal");
    }
  });

  // ── blocks with envVars → .env.example lists all required vars ──

  it("generates .env.example with all required env vars from blocks", () => {
    const input = buildInput({
      renderMode: "server",
      database: "d1",
      blocks: [
        { name: "auth-better-auth", variant: "default" },
        { name: "db-d1", variant: "default" },
      ],
    });
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const envExample = result.value.files[".env.example"];
      expect(envExample).toBeDefined();
      expect(envExample).toContain("AUTH_SECRET");
      expect(envExample).toContain("GITHUB_CLIENT_ID");
      expect(envExample).toContain("GITHUB_CLIENT_SECRET");
      expect(envExample).toContain("D1_DATABASE_ID");
    }
  });

  // ── No .env.example when no envVars ──

  it("does not generate .env.example when no blocks have envVars", () => {
    const input = buildInput();
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.files[".env.example"]).toBeUndefined();
    }
  });

  // ── Snapshot: file tree for static + cloudflare + 2 blocks ──

  it("file tree matches snapshot for static + cloudflare config", () => {
    const input = buildInput();
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const fileTree = Object.keys(result.value.files).sort();
      expect(fileTree).toMatchSnapshot();
    }
  });

  // ── Snapshot: file tree for server + auth + db ──

  it("file tree matches snapshot for server + auth + db config", () => {
    const input = buildInput({
      renderMode: "server",
      database: "d1",
      blocks: [
        { name: "auth-better-auth", variant: "default" },
        { name: "db-d1", variant: "default" },
      ],
    });
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const fileTree = Object.keys(result.value.files).sort();
      expect(fileTree).toMatchSnapshot();
    }
  });

  // ── Snapshot: file tree for i18n config ──

  it("file tree matches snapshot for i18n config", () => {
    const input = buildInput({
      locales: ["en", "es"],
      defaultLocale: "en",
    });
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const fileTree = Object.keys(result.value.files).sort();
      expect(fileTree).toMatchSnapshot();
    }
  });

  // ── Tailwind config generated for tailwind engine ──

  it("includes tailwind config for tailwind cssEngine", () => {
    const input = buildInput({ cssEngine: "tailwind" });
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.files["tailwind.css"]).toBeDefined();
      expect(result.value.files["tailwind.css"]).toContain("@theme");
    }
  });

  // ── No tailwind config for vanilla engine ──

  it("omits tailwind config for vanilla cssEngine", () => {
    const input = buildInput({ cssEngine: "vanilla" });
    const result = scaffold(input);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.files["tailwind.css"]).toBeUndefined();
    }
  });

  // ── Validation errors propagate ──

  it("returns error for invalid config", () => {
    const input = buildInput({
      renderMode: "static",
      blocks: [{ name: "auth-better-auth", variant: "default" }],
    });
    const result = scaffold(input);

    expect(result.ok).toBe(false);
  });
});
