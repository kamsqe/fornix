import type { ResolvedConfig } from "../schemas/config.js";

export type FileMap = Record<string, string>;

/**
 * Generates the base Astro project directory structure and core files.
 * Returns a map of relative file paths to string contents.
 */
export function generateStructure(config: ResolvedConfig): FileMap {
  const files: FileMap = {};

  // 1. package.json
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
      ...(config.cssEngine === "tailwind" && {
        tailwindcss: "^4.0.0",
        "@tailwindcss/vite": "^4.0.0",
      }),
    },
    devDependencies: {
      typescript: "^5.7.0",
    },
  };
  files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";

  // 2. tsconfig.json
  const tsconfig = {
    extends: "astro/tsconfigs/strict",
    compilerOptions: {
      jsx: "preserve",
      jsxImportSource: "react", // Even if not using React yet, good default for UI frameworks
      strictNullChecks: true,
      baseUrl: ".",
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
  files["src/pages/index.astro"] = `
---
import Layout from '../layouts/Layout.astro';
---
<Layout title="Welcome to Astro.">
  <main>
    <h1>Welcome to <span class="text-gradient">${config.projectName}</span></h1>
  </main>
</Layout>
`.trim() + "\n";

  // 5. Base Layout (needed by index.astro)
  files["src/layouts/Layout.astro"] = `
---
interface Props {
  title: string;
}
const { title } = Astro.props;
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
