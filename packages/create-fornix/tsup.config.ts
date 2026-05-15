import { defineConfig } from "tsup";
import { cp, chmod } from "node:fs/promises";
import { join } from "node:path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  dts: false,
  sourcemap: true,
  splitting: false,
  noExternal: ["fornix-registry"],
  async onSuccess() {
    // Templates are loaded by `templates.ts` at runtime via fs — they need
    // to ship alongside the bundled JS.
    await cp("src/templates", join("dist", "templates"), { recursive: true });
    // Mark the CLI entry executable so `node_modules/.bin/create-fornix` works.
    await chmod(join("dist", "cli.js"), 0o755);
  },
});
