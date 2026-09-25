import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // The real package throws outside the RSC bundler condition.
      "server-only": fromRoot("./tests/stubs/server-only.ts"),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
