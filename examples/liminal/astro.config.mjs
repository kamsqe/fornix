// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  devToolbar: { enabled: false },
  vite: {
    build: {
      cssCodeSplit: false,
    },
  },
});
