import type { ResolvedConfig } from "../schemas/config.js";
import type { BlockManifest } from "fornix-registry";

export type FileMap = Record<string, string>;

/**
 * Generates the base Astro project directory structure and core files.
 * Returns a map of relative file paths to string contents.
 */
export function generateStructure(config: ResolvedConfig, manifests: ReadonlyArray<BlockManifest> = []): FileMap {
  const files: FileMap = {};

  // 1. package.json
  const adapterDeps = getAdapterDependencies(config);
  const blockDeps = getBlockDependencies(manifests);
  const pkg = {
    name: config.projectName,
    type: "module",
    version: "0.0.1",
    scripts: {
      dev: "astro dev",
      start: "astro dev",
      build: "astro check && astro build",
      preview: "astro preview",
      astro: "astro",
    },
    dependencies: {
      astro: "^5.2.0",
      "@astrojs/check": "^0.9.0",
      ...(config.cssEngine === "tailwind" && {
        tailwindcss: "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
      }),
      ...adapterDeps,
      ...blockDeps,
    },
    devDependencies: {
      typescript: "^5.7.0",
      ...(config.deployTarget === "cloudflare" && {
        "@cloudflare/workers-types": "^4.0.0",
      }),
    },
  };
  files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";

  // 2. tsconfig.json
  const tsconfig = {
    extends: "astro/tsconfigs/strict",
    compilerOptions: {
      jsx: "preserve",
      jsxImportSource: "react",
      strictNullChecks: true,
      baseUrl: ".",
      ...(config.deployTarget === "cloudflare" && {
        types: ["@cloudflare/workers-types"],
      }),
      paths: {
        "@/*": ["src/*"],
      },
    },
  };
  files["tsconfig.json"] = JSON.stringify(tsconfig, null, 2) + "\n";

  // 3. .gitignore
  files[".gitignore"] = `
# build output
dist/
.astro/

# dependencies
node_modules/

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# environment variables
.env
.env.production
.env.development

# OS files
.DS_Store
Thumbs.db
`.trim() + "\n";

  // 4. Base Astro file
  const blockImports: string[] = [];
  const blockComponents: string[] = [];
  
  if (manifests.length > 0) {
    for (const manifest of manifests) {
      if (manifest.type !== 'section') continue;

      // Find the main component file logic: usually the first .astro or .tsx file
      const mainFile = manifest.files.find(f => f.destination.endsWith('.astro') || f.destination.endsWith('.tsx'));
      if (mainFile) {
        const componentName = manifest.name
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join('');
        
        let importPath = mainFile.destination;
        if (importPath.startsWith('src/')) {
          importPath = '../' + importPath.substring(4);
        }
        
        blockImports.push(`import ${componentName} from '${importPath}';`);
        blockComponents.push(`    <${componentName} />`);
      }
    }
  }

  const indexAstroContent = `
---
import Layout from '../layouts/Layout.astro';
${blockImports.join('\n')}
---
<Layout title="Welcome to ${config.projectName}.">
  <main>
${blockComponents.length > 0 ? blockComponents.join('\n') : `    <h1>Welcome to <span class="text-gradient">${config.projectName}</span></h1>`}
  </main>
</Layout>
`.trim() + "\n";

  files["src/pages/index.astro"] = indexAstroContent;

  // 5. Base Layout (needed by index.astro)
  const tailwindImport = config.cssEngine === "tailwind"
    ? '\nimport "../../tailwind.css";'
    : '';

  files["src/layouts/Layout.astro"] = `
---
interface Props {
  title: string;
}
const { title } = Astro.props;${tailwindImport}
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Astro description" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--color-background, #0f172a);
    color: var(--color-foreground, #f8fafc);
    line-height: 1.6;
    min-height: 100vh;
  }

  img, video {
    max-width: 100%;
    height: auto;
    display: block;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
</style>
`.trim() + "\n";

  // 6. Wrangler config if cloudflare
  if (config.deployTarget === "cloudflare") {
    // We use wrangler.json as the modern standard
    const wrangler = {
      name: config.projectName,
      compatibility_date: "2025-02-14",
      // ... Add observability/pages_build_output_dir as needed.
      // Basic structure:
      pages_build_output_dir: "dist",
      observability: {
        enabled: true,
      },
    };
    files["wrangler.json"] = JSON.stringify(wrangler, null, 2) + "\n";
  }

  return files;
}

// ── Block Dependencies ───────────────────────────────────

function getBlockDependencies(
  manifests: ReadonlyArray<BlockManifest>,
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const manifest of manifests) {
    if (manifest.dependencies) {
      Object.assign(merged, manifest.dependencies);
    }
  }
  return merged;
}

// ── Adapter Dependencies ─────────────────────────────────

function getAdapterDependencies(
  config: ResolvedConfig
): Record<string, string> {
  if (config.renderMode === "static" && config.deployTarget === "static") {
    return {};
  }

  const adapterMap: Record<string, Record<string, string>> = {
    cloudflare: { "@astrojs/cloudflare": "^12.0.0" },
    vercel: { "@astrojs/vercel": "^8.0.0" },
    netlify: { "@astrojs/netlify": "^6.0.0" },
  };

  return adapterMap[config.deployTarget] ?? {};
}
