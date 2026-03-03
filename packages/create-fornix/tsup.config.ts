import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  dts: false, // CLI binary — no consumers need type declarations
  sourcemap: true,
  splitting: false,
  noExternal: ["fornix-registry"], // Bundle workspace dep — not available on npm
  banner: {
    js: "#!/usr/bin/env node",
  },
});
