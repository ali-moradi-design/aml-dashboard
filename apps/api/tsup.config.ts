import { defineConfig } from "tsup";

export default defineConfig({
  // The seed is built too, so the nightly demo reset can run it in production (dist/seed.js).
  entry: { main: "src/main.ts", seed: "prisma/seed.ts" },
  format: ["esm"],
  platform: "node",
  target: "node24",
  sourcemap: true,
  clean: true,
  // The shared package is TypeScript source, so bundle it into the API build.
  noExternal: ["@aml/shared"],
});
