import { defineConfig } from "tsup";
import { cp, chmod } from "node:fs/promises";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");

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

    // Blocks, palettes, and primitives are read from the filesystem at
    // scaffold time, so a published CLI needs them bundled under `dist/`.
    // The runtime resolver (workspace.ts) prefers these bundled paths when
    // present, falling back to the workspace for dev.
    await cp(
      join(REPO_ROOT, "packages", "fornix-blocks", "blocks"),
      join("dist", "blocks"),
      { recursive: true },
    );
    await cp(
      join(REPO_ROOT, "packages", "fornix-registry", "palettes"),
      join("dist", "palettes"),
      { recursive: true },
    );
    await cp(
      join(REPO_ROOT, "packages", "fornix-primitives", "src"),
      join("dist", "primitives"),
      { recursive: true },
    );

    // Mark the CLI entry executable so `node_modules/.bin/create-fornix` works.
    await chmod(join("dist", "cli.js"), 0o755);
  },
});
