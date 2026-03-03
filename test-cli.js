import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

const projectDir = resolve(process.cwd(), 'playground/test-project');

if (existsSync(projectDir)) {
  rmSync(projectDir, { recursive: true, force: true });
}

console.log('Running CLI...');
execSync(
  'pnpm --filter create-fornix build',
  { stdio: 'inherit' }
);
execSync(
  'cd packages/create-fornix && node dist/index.js create ../../playground/test-project --blocks blog-mdx,docs-collection,layout-marketing,layout-docs,layout-dashboard --render server --deploy cloudflare --yes',
  { stdio: 'inherit' }
);

console.log('Validating output...');
const files = [
  'astro.config.mjs',
  'src/content/config.ts',
  'src/content/blog-schema.ts',
  'src/content/docs-schema.ts',
  'src/pages/blog/index.astro',
  'src/pages/blog/[slug].astro',
  'src/pages/docs/[...slug].astro',
  'src/pages/rss.xml.ts',
  'src/layouts/layout-marketing.astro',
  'src/content/layouts/layout-marketing.json',
  'src/layouts/layout-docs.astro',
  'src/content/layouts/layout-docs.json',
  'src/layouts/layout-dashboard.astro',
  'src/content/layouts/layout-dashboard.json',
];

for (const file of files) {
  if (!existsSync(resolve(projectDir, file))) {
    console.error(`❌ Missing file: ${file}`);
    process.exit(1);
  }
}

console.log('✅ Testing completed successfully!');
