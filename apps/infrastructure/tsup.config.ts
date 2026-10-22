import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/lambda/telemetry-analysis.ts" },
  format: ["cjs"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
});
