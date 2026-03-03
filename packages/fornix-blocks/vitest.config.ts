import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "fornix-registry": resolve(__dirname, "../fornix-registry/src/index.ts"),
    },
  },
});
