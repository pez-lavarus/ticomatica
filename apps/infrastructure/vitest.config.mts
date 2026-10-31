import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // TypeScript also emits the test files into dist during builds.
    // Run the source tests once and leave generated CommonJS files alone.
    include: ["test/**/*.test.ts"],
  },
});
