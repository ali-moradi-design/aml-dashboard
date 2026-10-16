import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  sourcemap: true,
  clean: true,
  // The shared package is TypeScript source, so bundle it into the API build.
  noExternal: ["@aml/shared"],
});
