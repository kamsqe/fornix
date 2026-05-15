#!/usr/bin/env node
/**
 * Build the Fornix showcase — a deployable demo site scaffolded *with Fornix
 * itself* via the published CLI binary, so the marketing site dogfoods the
 * actual user surface.
 *
 * Steps:
 *   1. Build the create-fornix CLI (so `dist/cli.js` is current)
 *   2. Wipe any previous showcase under `examples/showcase`
 *   3. Invoke `dist/cli.js` to scaffold the showcase
 *   4. Run `npm install` and `astro build` in the scaffolded project
 *
 * Output: `examples/showcase/dist/` ready for `wrangler pages deploy`.
 *
 * Run from repo root:
 *   pnpm showcase          # build it
 *   pnpm showcase:dev      # build then `astro preview`
 *   pnpm showcase:deploy   # build then `wrangler pages deploy` (needs CF auth)
 */
import { execSync } from "node:child_process";
import { rmSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI_BIN = resolve(ROOT, "packages", "create-fornix", "dist", "cli.js");
const EXAMPLES_DIR = resolve(ROOT, "examples");
const SHOWCASE_DIR = resolve(EXAMPLES_DIR, "showcase");

const PROJECT_NAME = "showcase";
const PALETTE = "midnight";

// Curated, conflict-free block list. The pipeline's category-based sort
// puts these in render order automatically.
const BLOCKS = [
  "header-sticky",
  "hero-gradient",
  "logo-cloud",
  "features-grid",
  "features-bento",
  "stats-strip",
  "how-it-works",
  "testimonials-carousel",
  "pricing-table",
  "faq-accordion",
  "cta-banner",
  "footer-rich",
];

function step(msg) {
  process.stdout.write(`→ ${msg}\n`);
}

// 1. Build the CLI so dist/cli.js is current
step("Building create-fornix CLI");
execSync("pnpm --filter create-fornix build", { cwd: ROOT, stdio: "inherit" });

if (!existsSync(CLI_BIN)) {
  console.error(`CLI not at ${CLI_BIN} after build`);
  process.exit(1);
}

// 2. Clean previous
if (existsSync(SHOWCASE_DIR)) {
  step(`Removing previous build at ${SHOWCASE_DIR}`);
  rmSync(SHOWCASE_DIR, { recursive: true, force: true });
}

// 3. Scaffold via the CLI binary (dogfooding)
step(`Scaffolding ${PROJECT_NAME} (${BLOCKS.length} blocks, palette: ${PALETTE})`);
execSync(
  `node ${JSON.stringify(CLI_BIN)} ${PROJECT_NAME} --blocks ${BLOCKS.join(",")} --palette ${PALETTE} --deploy cloudflare --yes`,
  { cwd: EXAMPLES_DIR, stdio: "inherit" },
);

// 4. Install + build the scaffolded site
step("npm install (showcase)");
execSync("npm install --no-audit --no-fund --loglevel=error", {
  cwd: SHOWCASE_DIR,
  stdio: "inherit",
});

step("astro build (showcase)");
execSync("npx astro build", { cwd: SHOWCASE_DIR, stdio: "inherit" });

process.stdout.write(`\n✓ Showcase built at ${SHOWCASE_DIR}/dist\n`);
process.stdout.write(`  pnpm showcase:dev      preview locally\n`);
process.stdout.write(`  pnpm showcase:deploy   deploy to Cloudflare Pages\n`);
