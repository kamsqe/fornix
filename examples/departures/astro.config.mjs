import { defineConfig } from "astro/config";

// DEPARTURES — Astro config
// Output: static. Deploys to Cloudflare Pages via `wrangler pages deploy dist`.
// No integrations, no React, no Tailwind. The whole thing is HTML + CSS + ~1KB JS.

export default defineConfig({
  site: "https://departures.pages.dev",
  output: "static",
  build: {
    inlineStylesheets: "always",
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "viewport",
  },
  vite: {
    build: {
      cssMinify: "lightningcss",
    },
  },
});
